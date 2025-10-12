import { ClockCircleOutlined, HistoryOutlined } from "@ant-design/icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Flex, Skeleton, Spin, Typography } from "antd";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { PageViews } from "@/components/PageViews";
import { getPageCover } from "@/helpers/content";
import styles from "./styles.module.scss";

const { Title } = Typography;

interface DevlogPost {
	id: string;
	projectId: string;
	content: string;
	coverImage?: string;
	publishedAt: string;
	video: string | null;
	project?: {
		name: string;
		coverImage: string;
		slug: string;
	};
}

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

const PostCard: React.FC<{ post: DevlogPost; onClick: (e: React.MouseEvent) => void }> = ({
	post,
	onClick,
}) => {
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
		return `${text.slice(0, maxLength)}...`;
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
		} catch {
			return "";
		}
	};

	const stripHtml = (html: string) => {
		return html.replace(/<[^>]*>/g, "");
	};

	const pageCover = getPageCover({
		content: post.content,
		video: post.video,
		project: post.project,
	});

	return (
		<Link href={`/devlog/${post.id}`}>
			<div role="button" tabIndex={0} className={styles.postCard} onClick={onClick}>
				<div className={styles.postContent}>
					<div className={styles.postImage}>
						{!imageError && pageCover ? (
							<Image
								src={pageCover}
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
						<p className={styles.postExcerpt}>
							{truncateText(cleanMarkdown(stripHtml(post.content)), 300)}
						</p>
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
							<span>•</span>
							<span>
								<ClockCircleOutlined style={{ marginRight: 4 }} />
								{formatDate(post.publishedAt)}
							</span>
							<PageViews path={`/devlog/${post.id}`} startDate={post.publishedAt} />
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
					<Skeleton.Input active style={{ width: "70%", height: 24, marginBottom: 8 }} />
					<Skeleton active paragraph={{ rows: 2 }} style={{ marginBottom: 12 }} />
					<div className={styles.postMeta}>
						<Skeleton.Input active style={{ width: "30%", height: 16 }} />
						<span>•</span>
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

	const { data, isLoading, isFetched, fetchNextPage, hasNextPage, isFetchingNextPage } =
		useInfiniteQuery({
			queryKey: ["devlog-posts", projectId],
			queryFn: async ({ pageParam = 1 }) => {
				const response = await axios.get<DevlogPost[]>(
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
			if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100) {
				if (hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			}
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, [fetchNextPage, hasNextPage, isFetchingNextPage]);

	// if (isLoading) {
	// 	return (
	// 		<div className={styles.devlogPostsContainer}>
	// 			<Flex justify="space-between" wrap>
	// 				<Title level={2}>
	// 					<HistoryOutlined style={{ marginRight: 8 }} />
	// 					{t("page.hub.activity", "Activity")}
	// 				</Title>
	// 			</Flex>

	// 		</div>
	// 	);
	// }

	if (!posts.length && isFetched) {
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

			{isLoading ? (
				<div className={styles.postsList}>
					{[...Array(3)].map((_, idx) => (
						<PostSkeleton key={`skeleton-${idx.toString}`} />
					))}
				</div>
			) : posts.length > 0 ? (
				<>
					<div className={styles.postsList}>
						{posts.map((post) => (
							<div key={post.id} className={styles.postWrapper}>
								<PostCard post={post} onClick={(e) => e.stopPropagation()} />
							</div>
						))}
					</div>

					{hasNextPage && (
						<div className={styles.loadMore}>
							<Spin spinning={isFetchingNextPage} />
						</div>
					)}
				</>
			) : isFetched ? (
				<div className={styles.empty}>{t("No devlog posts yet")}</div>
			) : null}
		</div>
	);
};

export default DevlogPosts;
