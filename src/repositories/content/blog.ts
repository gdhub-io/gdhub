import type { OutputData } from "@editorjs/editorjs";
import { BlogPostStatus } from "@gdhub-io/gdhub-prisma";
import { getEditorjsFirstParagraph } from "@/helpers/content";
import { prisma } from "@/services/prisma";

const authors = { select: { name: true, image: true } } as const;

const toAuthor = (author: { name: string | null; image: string | null }) => ({
	name: author.name ?? "",
	image: author.image ?? undefined,
});

/** The blog index: no post bodies, only the excerpt cut from each. */
export async function listPublishedBlogPosts() {
	const posts = await prisma.blogPost.findMany({
		where: { status: BlogPostStatus.Published },
		select: {
			id: true,
			title: true,
			slug: true,
			image: true,
			publishedAt: true,
			content: true,
			authors,
		},
		orderBy: { publishedAt: "desc" },
	});

	return posts.map((post) => ({
		id: post.id,
		title: post.title,
		slug: post.slug ?? "",
		image: post.image ?? undefined,
		publishedAt: post.publishedAt?.toISOString() ?? "",
		description: getEditorjsFirstParagraph(post.content as OutputData),
		authors: post.authors.map(toAuthor),
	}));
}

export async function findPublishedBlogPost(slug: string) {
	const post = await prisma.blogPost.findUnique({
		where: { slug, status: BlogPostStatus.Published },
		include: { authors },
	});
	if (!post) return null;

	return {
		...post,
		slug: post.slug ?? slug,
		createdAt: post.createdAt.toISOString(),
		updatedAt: post.updatedAt.toISOString(),
		publishedAt: post.publishedAt?.toISOString() ?? "",
		description: getEditorjsFirstParagraph(post.content as OutputData),
		authors: post.authors.map(toAuthor),
	};
}
