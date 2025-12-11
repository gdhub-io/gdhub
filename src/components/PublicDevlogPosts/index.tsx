import { ClockCircleOutlined, HistoryOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Flex, Skeleton, Typography } from "antd";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import type React from "react";
import { useMemo, useState } from "react";
import { PageViews } from "@/components/PageViews";
import { getPageCover } from "@/helpers/content";
import styles from "./styles.module.scss";

const { Title, Text } = Typography;

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

interface PublicDevlogPostsProps {
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
	post: DevlogPost;
	onClick: (e: React.MouseEvent) => void;
}> = ({ post, onClick }) => {
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

	const truncateText = (text: string | undefined, maxLength: number) => {
		if (!text) return "";
		if (text.length <= maxLength) return text;
		return text.slice(0, maxLength) + "...";
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

	const pageCover = useMemo(
		() =>
			getPageCover({
				content: post.content,
				video: post.video,
				project: post.project,
			}),
		[post],
	);

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
								onClick={(e) => {
									e.stopPropagation();
									router.push(`/project/${post.project?.slug}`);
								}}
							>
								{post.project?.name}
							</span>
							<span className={styles.dot}>•</span>
							<span>
								<ClockCircleOutlined style={{ marginRight: 4 }} />
								{formatDate(post.publishedAt)}
							</span>
							<PageViews
								path={`/devlog/${post.id}`}
								startDate={post.publishedAt}
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

const PublicDevlogPosts = ({ projectId }: PublicDevlogPostsProps) => {
	const { t } = useTranslate();
	const limit = 5;

	const { data: posts, isLoading } = useQuery<DevlogPost[]>({
		queryKey: ["public-devlog-posts", projectId],
		queryFn: async () => {
			const url = `/api/devlogs?limit=${limit}${projectId ? `&projectId=${projectId}` : ""}`;
			const response = await axios.get<DevlogPost[]>(url);
			return response.data.slice(0, limit);
		},
		enabled: true,
		refetchOnWindowFocus: false,
	});

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

	if (!posts?.length) {
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
					<div key={post.id} className={styles.postWrapper}>
						<PostCard post={post} onClick={(e) => e.stopPropagation()} />
					</div>
				))}
			</div>
		</div>
	);
};

export default PublicDevlogPosts;
