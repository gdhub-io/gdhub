import type { Prisma } from "@gdhub-io/gdhub-prisma";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import {
	getEditorjsPageCover,
	getEditorjsShortContent,
	getPageCover,
} from "@/helpers/content";
import { devlogTitle } from "@/helpers/devlog";
import { devlogOgImage } from "@/services/telegram/messages";
import { DevlogPostClient, type Post } from "./DevlogPostClient";

type Params = Promise<{ projectReportId: string }>;

const loadPost = cache(
	async (
		projectReportId: string,
	): Promise<{ post: Post; contentLength: number } | null> => {
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
		const cookieHeader = (await headers()).get("cookie") ?? "";

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
	const title = devlogTitle(post.project?.name ?? "GDHub", post.number);
	// The card the admin announce posts, so a link shared by hand looks the same.
	const ogImage = devlogOgImage({
		id: post.id,
		number: post.number,
		content: post.content,
		contentEditor: (post.contentEditor ?? null) as Prisma.JsonValue,
		project: {
			name: post.project?.name ?? "GDHub",
			coverImage: post.project?.coverImage ?? null,
		},
	});
	return {
		title,
		alternates: { canonical: `/devlog/${projectReportId}` },
		openGraph: {
			type: "article",
			url: `/devlog/${projectReportId}`,
			title,
			images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
		},
		twitter: {
			card: "summary_large_image",
			title,
			images: [ogImage],
		},
	};
}

export default async function DevlogPostPage({ params }: { params: Params }) {
	const { projectReportId } = await params;
	if (!projectReportId) notFound();

	const result = await loadPost(projectReportId);
	if (!result) notFound();

	return <DevlogPostClient post={result.post} />;
}
