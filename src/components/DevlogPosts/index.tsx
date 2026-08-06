import type { OutputData } from "@editorjs/editorjs";
import type { Project, ProjectReport } from "@gdhub-io/gdhub-prisma";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Skeleton, Spin, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import Image from "next/image";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApplauseButton } from "@/components/ApplauseButton";
import { DevlogPostLink } from "@/components/DevlogPostLink";
import {
	getHubSectionShellClass,
	HubSectionBody,
	HubSectionHeader,
} from "@/components/hub/HubSection";
import { PageViews } from "@/components/PageViews";
import {
	getEditorjsPageCover,
	getEditorjsShortContent,
	getPageCover,
} from "@/helpers/content";
import { htmlFragmentToPlainText } from "@/helpers/telegramHtml";
import type { DevlogFeedPage } from "@/types/devlog";
import styles from "./styles.module.scss";

const { Title } = Typography;

interface DevlogPostsProps {
	projectId?: string;
	variant?: "default" | "hub";
	/** Outer frame removed — used inside hub `mainSectionsBundle` */
	bundleInset?: boolean;
	title?: React.ReactNode;
	/** "section" — header inside hub shell (default for hub variant); "title" — `<Title level={2}>` above the shell */
	headerStyle?: "section" | "title";
}

const PostCard: React.FC<{
	post: ProjectReport & {
		project: Project;
		applauseCount?: number;
		author: {
			image: string;
			name: string;
		};
	};
	onClick: (e: React.MouseEvent) => void;
}> = ({ post, onClick }) => {
	/** Two letters when there is no photo — a tinted circle beats a generated face. */
	const authorInitials = useMemo(() => {
		const name = post.author?.name?.trim();
		if (!name) return "?";
		return name
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? "")
			.join("");
	}, [post.author?.name]);

	const getPreviewText = () => {
		const raw = post.contentEditor
			? getEditorjsShortContent(
					post.contentEditor as unknown as OutputData,
					300,
				)
			: post.content;
		return htmlFragmentToPlainText(raw ?? "");
	};

	const pageCoverFromContent = useMemo(
		() =>
			getPageCover({
				content: post.content,
				video: post.video,
				project: post.project,
			}),
		[post],
	);

	const pageCoverFromEditorjs = useMemo(() => {
		return post.contentEditor
			? getEditorjsPageCover(post.contentEditor as unknown as OutputData)
			: null;
	}, [post.contentEditor]);

	const postCover = pageCoverFromEditorjs || pageCoverFromContent;

	return (
		<DevlogPostLink
			post={post}
			style={{
				textDecoration: "none",
				color: "var(--ant-color-text-secondary)",
			}}
		>
			<div
				role="button"
				tabIndex={0}
				className={styles.postCard}
				onClick={onClick}
			>
				<div className={styles.postContent}>
					<div className={styles.postHeader}>
						{post.author?.image ? (
							<Image
								src={post.author.image}
								alt={post.author?.name || ""}
								width={36}
								height={36}
								className={styles.authorAvatar}
								unoptimized
							/>
						) : (
							<span className={styles.authorAvatar} aria-hidden="true">
								{authorInitials}
							</span>
						)}

						{/* The project leads: in a hub feed the reader picks what to read by
						    project, not by who typed it. The name is not a link here — the
						    post it opens carries one. */}
						<span className={styles.postIdentity}>
							<span className={styles.postProject}>{post.project?.name}</span>
							<span className={styles.postAuthor}>{post.author?.name}</span>
						</span>
					</div>

					<div className={styles.textContent}>
						<p className={styles.postExcerpt}>{getPreviewText()}</p>
					</div>

					{postCover ? (
						<div className={styles.postImage}>
							<Image
								src={postCover}
								alt={post.project?.name || ""}
								width={240}
								height={240}
								unoptimized
							/>
						</div>
					) : null}

					<div className={styles.postMeta}>
						<span className={styles.postStats}>
							<ApplauseButton
								subject={{ kind: "devlog", id: post.id }}
								count={post.applauseCount}
							/>
							{!post.isSystem && (
								<PageViews
									path={`/devlog/${post.id}`}
									startDate={post.publishedAt.toString()}
								/>
							)}
						</span>

						<span className={styles.postTime}>
							{dayjs(post.publishedAt).fromNow()}
						</span>
					</div>
				</div>
			</div>
		</DevlogPostLink>
	);
};

const PostSkeleton = () => {
	return (
		<div className={styles.postCard}>
			<div className={styles.postContent}>
				<div className={styles.postHeader}>
					<Skeleton.Avatar active size={36} shape="circle" />
					<div className={styles.postIdentity}>
						<Skeleton.Input active style={{ width: 150, height: 14 }} />
						<Skeleton.Input active style={{ width: 96, height: 12 }} />
					</div>
				</div>

				<div className={styles.textContent}>
					<Skeleton active paragraph={{ rows: 2 }} title={false} />
				</div>

				<div className={styles.postImage}>
					<Skeleton.Node active style={{ width: "100%", height: "100%" }} />
				</div>

				<div className={styles.postMeta}>
					<Skeleton.Input active style={{ width: 60, height: 14 }} />
				</div>
			</div>
		</div>
	);
};

const DevlogPosts = ({
	projectId,
	variant = "default",
	bundleInset = false,
	title,
	headerStyle,
}: DevlogPostsProps) => {
	const { t } = useTranslate();
	const limit = 5;

	const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useInfiniteQuery({
			queryKey: ["devlog-posts", projectId],
			queryFn: async ({ pageParam }) => {
				const params = new URLSearchParams({ limit: String(limit) });
				if (projectId) params.set("projectId", projectId);
				if (pageParam) params.set("after", pageParam);

				const response = await axios.get<DevlogFeedPage<ProjectReport>>(
					`/api/devlogs?${params}`,
				);

				return response.data;
			},
			getNextPageParam: (lastPage) => lastPage.nextCursor,
			initialPageParam: null as string | null,
		});

	const posts = data?.pages.flatMap((page) => page.items || []) || [];

	// The feed used to listen on `window` and measure `document.scrollHeight`,
	// but the product shell scrolls an inner element and keeps `body` at
	// `overflow: hidden` — so `window` never fired and the next page never
	// loaded. A sentinel does not care which element scrolls.
	const sentinelRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const node = sentinelRef.current;
		if (!node || !hasNextPage) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
			},
			// Fetch a screenful early, so the next posts are already in place by the
			// time the reader gets there instead of hitting the bottom and waiting.
			{ rootMargin: "800px" },
		);
		observer.observe(node);
		return () => observer.disconnect();
	}, [fetchNextPage, hasNextPage, isFetchingNextPage]);

	const hubShell =
		variant === "hub"
			? getHubSectionShellClass(bundleInset ? "inset" : "standalone")
			: "";

	const useSectionHeader = variant === "hub" && headerStyle !== "title";
	const titleAboveShell = variant === "hub" && headerStyle === "title";

	const headerNode = useSectionHeader ? (
		<HubSectionHeader
			className={styles.feedHeader}
			title={
				title ?? t("hub.activity-feed.title", "Devlog posts from projects")
			}
		/>
	) : (
		<Title level={2} style={{ marginBottom: 24 }}>
			{title ?? t("page.hub.project-updates", "Project updates")}
		</Title>
	);

	const wrapHubShell = (inner: React.ReactNode) => (
		<>
			{titleAboveShell && headerNode}
			<div
				className={`${hubShell} ${styles.devlogPostsContainer} ${styles.hubVariant}`}
			>
				{!titleAboveShell && headerNode}
				{inner}
			</div>
		</>
	);

	if (isLoading) {
		const body = (
			<div className={styles.postsList}>
				{[...Array(3)].map((_, index) => (
					<div
						key={`post-skeleton-${index.toString()}`}
						className={styles.postWrapper}
					>
						<PostSkeleton />
					</div>
				))}
			</div>
		);

		if (variant === "hub") {
			return wrapHubShell(<HubSectionBody flush>{body}</HubSectionBody>);
		}

		return (
			<div className={styles.devlogPostsContainer}>
				{headerNode}
				{body}
			</div>
		);
	}

	if (!posts.length) {
		const empty = (
			<div className={styles.empty}>{t("No devlog posts yet")}</div>
		);
		if (variant === "hub") {
			return wrapHubShell(<HubSectionBody>{empty}</HubSectionBody>);
		}
		return empty;
	}

	const listBlock = (
		<>
			<div className={styles.postsList}>
				{posts.map((post) => (
					<div key={`post-${post.id}`} className={styles.postWrapper}>
						<PostCard
							post={
								post as ProjectReport & {
									project: Project;
									author: {
										image: string;
										name: string;
									};
								}
							}
							onClick={(e) => e.stopPropagation()}
						/>
					</div>
				))}
			</div>

			{hasNextPage ? (
				<div className={styles.loadMore} ref={sentinelRef}>
					<Spin spinning={isFetchingNextPage} />
				</div>
			) : (
				posts.length > 0 && (
					<div className={styles.feedEnd}>
						{t("page.devlog.feed-end", "You've reached the end of the feed")}
					</div>
				)
			)}
		</>
	);

	if (variant === "hub") {
		return wrapHubShell(<HubSectionBody flush>{listBlock}</HubSectionBody>);
	}

	return (
		<div className={styles.devlogPostsContainer}>
			{headerNode}
			{listBlock}
		</div>
	);
};

export default DevlogPosts;
