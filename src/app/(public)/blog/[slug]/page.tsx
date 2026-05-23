import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getEditorjsPageCover } from "@/helpers/content";
import { type BlogPost, BlogPostClient } from "./BlogPostClient";

type Params = Promise<{ slug: string }>;

const fetchPost = cache(async (slug: string): Promise<BlogPost | null> => {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
	try {
		const response = await fetch(`${baseUrl}/api/blog/${slug}`, {
			cache: "no-store",
		});
		if (!response.ok) return null;
		const data = await response.json();
		if (!data?.id) return null;

		return {
			...data,
			coverImage: data.coverImage || getEditorjsPageCover(data.content),
			content: JSON.stringify(data.content),
			description: data.description,
		};
	} catch (error) {
		console.error("Error fetching blog post:", error);
		return null;
	}
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
