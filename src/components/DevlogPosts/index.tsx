import { ClockCircleOutlined, HistoryOutlined } from "@ant-design/icons";
import type { OutputData } from "@editorjs/editorjs";
import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Flex, Skeleton, Spin, Typography } from "antd";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { PageViews } from "@/components/PageViews";
import {
	getEditorjsPageCover,
	getEditorjsShortContent,
	getPageCover,
} from "@/helpers/content";
import styles from "./styles.module.scss";

const { Title } = Typography;

interface DevlogPostsProps {
	projectId?: string;
}

const DefaultCover = ({ title }: { title: string }) => {
	return (
		<div className={styles.defaultCover}>
			<div className={styles.defaultCoverContent}>
				<div className={styles.defaultCoverInitials}>
					{title ? title.charAt(0).toUpperCase() : "?"}
				</div>
			</div>
		</div>
	);
};

const PostCard: React.FC<{
	post: prismaClient.ProjectReport & { project: prismaClient.Project };
	onClick: (e: React.MouseEvent) => void;
}> = ({ post, onClick }) => {
	const { t } = useTranslate();
	const router = useRouter();
	const [imageError, setImageError] = useState(false);

	const cleanMarkdown = (text: string) => {
		return text
			.replace(/\*\*(.*?)\*\*/g, "$1")
			.replace(/\*(.*?)\*/g, "$1")
			.replace(/\[(.*?)\]\((.*?)\)/g, "$1")
			.replace(/!\[(.*?)\]\((.*?)\)/g, "")
			.replace(/#{1,6}\s/g, "")
			.replace(/`(.*?)`/g, "$1")
			.replace(/```.*?\n([\s\S]*?)```/g, "$1")
			.trim();
	};

	const handleProjectClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		router.push(`/project/${post.project?.slug}`);
	};

	const truncateText = (text: string | undefined, maxLength: number) => {
		if (!text) return "";
		if (text.length <= maxLength) return text;
		return text.slice(0, maxLength) + "...";
	};

	const getInitials = (title: string) => {
		if (!title) return "";
		return title
			.split(" ")
			.map((word) => word[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	const formatDate = (dateString: string | undefined) => {
		if (!dateString) return "";
		try {
			const date = new Date(dateString);
			return (
				date.toLocaleDateString() +
				" " +
				date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
			);
		} catch (e) {
			return "";
		}
	};

	const stripHtml = (html: string) => {
		return html.replace(/<[^>]*>/g, "");
	};

	const getPreviewText = () => {
		return post.contentEditor
			? getEditorjsShortContent(
					post.contentEditor as unknown as OutputData,
					300,
				)
			: post.content;
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

	return (
		<Link href={`/devlog/${post.id}`}>
			<div
				role="button"
				tabIndex={0}
				className={styles.postCard}
				onClick={onClick}
			>
				<div className={styles.postContent}>
					<div className={styles.postImage}>
						{pageCoverFromEditorjs || pageCoverFromContent ? (
							<Image
								src={pageCoverFromEditorjs || pageCoverFromContent || ""}
								alt={post.project?.name || ""}
								width={240}
								height={240}
								unoptimized
								onError={() => setImageError(true)}
							/>
						) : (
							<DefaultCover title={post.project?.name || ""} />
						)}
					</div>
					<div className={styles.textContent}>
						<p className={styles.postExcerpt}>{getPreviewText()}</p>
						<div className={styles.postMeta}>
							<span
								role="link"
								tabIndex={0}
								onClick={handleProjectClick}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										handleProjectClick(e as unknown as React.MouseEvent);
									}
								}}
							>
								{post.project?.name}
							</span>
							<span className={styles.dot}>•</span>
							<span>
								<ClockCircleOutlined style={{ marginRight: 4 }} />
								{formatDate(post.publishedAt.toString())}
							</span>
							<PageViews
								path={`/devlog/${post.id}`}
								startDate={post.publishedAt.toString()}
							/>
						</div>
					</div>
				</div>
			</div>
		</Link>
	);
};

const PostSkeleton = () => {
	return (
		<div className={styles.postCard}>
			<div className={styles.postContent}>
				<div className={styles.postImage}>
					<Skeleton.Node active style={{ width: 240, height: 240 }} />
				</div>
				<div className={styles.textContent}>
					<Skeleton.Input
						active
						style={{ width: "70%", height: 24, marginBottom: 8 }}
					/>
					<Skeleton
						active
						paragraph={{ rows: 2 }}
						style={{ marginBottom: 12 }}
					/>
					<div className={styles.postMeta}>
						<Skeleton.Input active style={{ width: "30%", height: 16 }} />
						<span className={styles.dot}>•</span>
						<Skeleton.Input active style={{ width: "20%", height: 16 }} />
					</div>
				</div>
			</div>
		</div>
	);
};

const DevlogPosts = ({ projectId }: DevlogPostsProps) => {
	const { t } = useTranslate();
	const limit = 5;

	const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useInfiniteQuery({
			queryKey: ["devlog-posts", projectId],
			queryFn: async ({ pageParam = 1 }) => {
				const response = await axios.get<prismaClient.ProjectReport[]>(
					`/api/devlogs?page=${pageParam}&limit=${limit}${projectId ? `&projectId=${projectId}` : ""}`,
				);

				// Если это первая страница, возвращаем только первые 5 постов
				if (pageParam === 1) {
					return {
						posts: response.data.slice(0, limit) || [],
						nextPage: response.data.length > limit ? 2 : undefined,
					};
				}

				// Для последующих страниц возвращаем следующие 5 постов
				const startIndex = (pageParam - 1) * limit;
				const endIndex = startIndex + limit;
				return {
					posts: response.data.slice(startIndex, endIndex) || [],
					nextPage: endIndex < response.data.length ? pageParam + 1 : undefined,
				};
			},
			getNextPageParam: (lastPage) => lastPage.nextPage,
			initialPageParam: 1,
		});

	const posts = data?.pages.flatMap((page) => page.posts || []) || [];

	useEffect(() => {
		const handleScroll = () => {
			if (
				window.innerHeight + window.scrollY >=
				document.documentElement.scrollHeight - 100
			) {
				if (hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			}
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, [fetchNextPage, hasNextPage, isFetchingNextPage]);

	if (isLoading) {
		return (
			<div className={styles.devlogPostsContainer}>
				<Flex justify="space-between" wrap>
					<Title level={2}>
						<HistoryOutlined style={{ marginRight: 8 }} />
						{t("page.hub.activity", "Activity")}
					</Title>
				</Flex>
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
			</div>
		);
	}

	if (!posts.length) {
		return <div className={styles.empty}>{t("No devlog posts yet")}</div>;
	}

	return (
		<div className={styles.devlogPostsContainer}>
			<Flex justify="space-between" wrap>
				<Title level={2}>
					<HistoryOutlined style={{ marginRight: 8 }} />
					{t("page.hub.activity", "Activity")}
				</Title>
			</Flex>

			<div className={styles.postsList}>
				{posts.map((post) => (
					<div key={`post-${post.id}`} className={styles.postWrapper}>
						<PostCard
							post={
								post as prismaClient.ProjectReport & {
									project: prismaClient.Project;
								}
							}
							onClick={(e) => e.stopPropagation()}
						/>
					</div>
				))}
			</div>

			{hasNextPage && (
				<div className={styles.loadMore}>
					<Spin spinning={isFetchingNextPage} />
				</div>
			)}
		</div>
	);
};

export default DevlogPosts;
