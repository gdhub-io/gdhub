import type { Metadata } from "next";
import { listPublishedBlogPosts } from "@/repositories/content/blog";
import { BlogClient } from "./BlogClient";

export const revalidate = 300;

export const metadata: Metadata = {
	title: "Blog | gdhub.io",
	alternates: { canonical: "/blog" },
	openGraph: { type: "website", url: "/blog", title: "Blog | gdhub.io" },
};

export default async function BlogPage() {
	return <BlogClient posts={await listPublishedBlogPosts()} />;
}
