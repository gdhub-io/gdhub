"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { AdminSpace } from "@/components/spaces/AdminSpace";

const BlogPostEditor = dynamic(
	() => import("@/components/admin/BlogPostEditor").then((mod) => mod.default),
	{ ssr: false },
);

export default function BlogPostEditorAdminPage() {
	const params = useParams<{ id?: string }>();
	const postId = params?.id as string;

	return (
		<AdminSpace>
			<BlogPostEditor id={postId} />
		</AdminSpace>
	);
}
