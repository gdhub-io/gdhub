import type { Metadata } from "next";
import { BlogClient, type BlogPost } from "./BlogClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Blog | gdhub.io",
	alternates: { canonical: "/blog" },
	openGraph: { type: "website", url: "/blog", title: "Blog | gdhub.io" },
};

async function fetchBlogPosts(): Promise<BlogPost[]> {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
	try {
		const response = await fetch(`${baseUrl}/api/blog`, { cache: "no-store" });
		if (!response.ok) return [];
		return (await response.json()) ?? [];
	} catch (error) {
		console.error("Error fetching blog posts:", error);
		return [];
	}
}

export default async function BlogPage() {
	const posts = await fetchBlogPosts();
	return <BlogClient posts={posts} />;
}
