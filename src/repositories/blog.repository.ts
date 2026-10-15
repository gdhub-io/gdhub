import { BlogPostStatus } from "@gdhub-io/gdhub-prisma";
import { prisma } from "@/services/prisma";

const authors = { select: { name: true, image: true } } as const;

function firstParagraphExcerpt(content: unknown): string {
	const text: string | undefined = (content as any)?.blocks?.find(
		(block: any) => block.type === "paragraph",
	)?.data?.text;
	if (!text) return "";
	return text.length > 100 ? `${text.slice(0, 100)}...` : text;
}

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

	return posts.map(({ content, ...post }) => ({
		...post,
		description: firstParagraphExcerpt(content),
	}));
}

export async function findPublishedBlogPost(slug: string) {
	const post = await prisma.blogPost.findUnique({
		where: { slug, status: BlogPostStatus.Published },
		include: { authors },
	});
	if (!post) return null;

	return { ...post, description: firstParagraphExcerpt(post.content) };
}
