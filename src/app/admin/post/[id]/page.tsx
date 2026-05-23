"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { AdminLayout } from "@/layouts/AdminLayout";

const BlogPostEditor = dynamic(
	() => import("@/components/admin/BlogPostEditor").then((mod) => mod.default),
	{ ssr: false },
);

export default function BlogPostEditorAdminPage() {
	const params = useParams<{ id?: string }>();
	const postId = params?.id as string;

	return (
		<AdminLayout>
			<BlogPostEditor id={postId} />
		</AdminLayout>
	);
}
