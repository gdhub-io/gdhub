import { json } from "@/lib/api-handlers";
import { listPublishedBlogPosts } from "@/repositories/content/blog";

export const GET = async () => json(await listPublishedBlogPosts());
