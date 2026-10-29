import type { OutputData } from "@editorjs/editorjs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getEditorjsPageCover } from "@/helpers/content";
import { findPublishedBlogPost } from "@/repositories/content/blog";
import { type BlogPost, BlogPostClient } from "./BlogPostClient";

type Params = Promise<{ slug: string }>;

export const revalidate = 300;

// Empty: each page is built on its first request, not during `next build`.
export async function generateStaticParams() {
	return [];
}

const fetchPost = cache(async (slug: string): Promise<BlogPost | null> => {
	const post = await findPublishedBlogPost(slug);
	if (!post) return null;

	return {
		...post,
		coverImage: getEditorjsPageCover(post.content as OutputData) ?? undefined,
		content: JSON.stringify(post.content),
	};
});

export async function generateMetadata({
	params,
}: {
	params: Params;
}): Promise<Metadata> {
	const { slug } = await params;
	const post = await fetchPost(slug);
	if (!post) return { title: "Blog" };
	return {
		title: post.title,
		description: post.description || undefined,
		alternates: { canonical: `/blog/${slug}` },
		openGraph: {
			type: "article",
			url: `/blog/${slug}`,
			title: post.title,
			description: post.description || undefined,
			images: post.coverImage
				? [{ url: post.coverImage, alt: post.title }]
				: undefined,
		},
	};
}

export default async function BlogPostPage({ params }: { params: Params }) {
	const { slug } = await params;
	const post = await fetchPost(slug);

	if (!post) {
		notFound();
	}

	return <BlogPostClient post={post} />;
}
