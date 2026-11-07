"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { AdminSpace } from "@/components/spaces/AdminSpace";
import { PageLoading } from "@/components/ui";

// Editor.js reads `window` at import, so the editor's own frame cannot render on the server.
const BlogPostEditor = dynamic(
	() => import("@/components/admin/BlogPostEditor").then((mod) => mod.default),
	{ ssr: false, loading: () => <PageLoading /> },
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
