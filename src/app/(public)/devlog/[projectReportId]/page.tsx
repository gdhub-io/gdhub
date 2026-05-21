import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import {
	getCleanTextContent,
	getEditorjsPageCover,
	getEditorjsShortContent,
	getPageCover,
} from "@/helpers/content";
import { DevlogPostClient, type Post } from "./DevlogPostClient";

type Params = Promise<{ projectReportId: string }>;

const loadPost = cache(
	async (
		projectReportId: string,
	): Promise<{ post: Post; contentLength: number } | null> => {
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
		const cookieHeader = (await headers()).get("cookie") ?? "";
		const session = await auth();

		try {
			const response = await fetch(`${baseUrl}/api/devlog/${projectReportId}`, {
				cache: "no-store",
				headers: cookieHeader ? { cookie: cookieHeader } : undefined,
			});
			if (!response.ok) return null;
			const post = (await response.json()) as Post;
			if (!post?.id) return null;

			if (post.contentEditor) {
				post.pageCover =
					getEditorjsPageCover(post.contentEditor as any) ?? undefined;
			} else {
				post.pageCover = getPageCover(post as any) ?? undefined;
			}

			if (!session) {
				if (post.contentEditor) {
					post.content = getEditorjsShortContent(
						post.contentEditor as any,
						1000,
					);
					delete post.contentEditor;
				} else {
					post.content = getCleanTextContent(post.content, 1000);
				}
			}

			const contentLength = post.contentEditor
				? getEditorjsShortContent(post.contentEditor as any, 1000).length
				: post.content.length;

			return { post, contentLength };
		} catch (error) {
			console.error("Error fetching post:", error);
			return null;
		}
	},
);

export async function generateMetadata({
	params,
}: {
	params: Params;
}): Promise<Metadata> {
	const { projectReportId } = await params;
	const result = await loadPost(projectReportId);
	if (!result) return { title: "Devlog" };
	const { post } = result;
	return {
		title: post.title,
		alternates: { canonical: `/devlog/${projectReportId}` },
		openGraph: {
			type: "article",
			url: `/devlog/${projectReportId}`,
			title: post.title,
			images: post.pageCover
				? [{ url: post.pageCover, alt: post.title }]
				: undefined,
		},
	};
}

export default async function DevlogPostPage({ params }: { params: Params }) {
	const { projectReportId } = await params;
	if (!projectReportId) notFound();

	const result = await loadPost(projectReportId);
	if (!result) notFound();

	const session = await auth();

	return (
		<DevlogPostClient
			post={result.post}
			contentLength={result.contentLength}
			isAuthenticated={!!session}
		/>
	);
}
