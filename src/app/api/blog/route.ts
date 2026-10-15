import { json } from "@/lib/api-handlers";
import { listPublishedBlogPosts } from "@/repositories/blog.repository";

export const GET = async () => json(await listPublishedBlogPosts());
