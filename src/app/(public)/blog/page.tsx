import type { Metadata } from "next";
import { listPublishedBlogPosts } from "@/repositories/blog.repository";
import { BlogClient, type BlogPost } from "./BlogClient";

export const revalidate = 300;

export const metadata: Metadata = {
	title: "Blog | gdhub.io",
	alternates: { canonical: "/blog" },
	openGraph: { type: "website", url: "/blog", title: "Blog | gdhub.io" },
};

export default async function BlogPage() {
	const posts = await listPublishedBlogPosts();
	return (
		<BlogClient
			posts={posts.map(
				(post): BlogPost => ({
					...post,
					slug: post.slug ?? "",
					image: post.image ?? undefined,
					publishedAt: post.publishedAt?.toISOString() ?? "",
					authors: post.authors.map((author) => ({
						name: author.name ?? "",
						image: author.image ?? undefined,
					})),
				}),
			)}
		/>
	);
}
