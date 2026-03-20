import { ClockCircleOutlined, HistoryOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Flex, Skeleton, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import type React from "react";
import { useState } from "react";
import applauseDefaultAnimation from "@/assets/images/icons/applaause-default.json";
import { PageViews } from "@/components/PageViews";
import styles from "./styles.module.scss";

const { Title, Text } = Typography;
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface DevlogPost {
	id: string;
	projectId: string;
	content: string;
	coverImage?: string;
	publishedAt: string;
	applauseCount?: number;
	video: string | null;
	project?: {
		name: string;
		coverImage: string;
		slug: string;
	};
}

interface ProjectDevlogPostsProps {
	projectId: string;
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
	const { t } = useTranslate();
	const router = useRouter();
	const [imageError, setImageError] = useState(false);
	const [contentImageError, setContentImageError] = useState(false);

	const cleanMarkdown = (text: string) => {
		return text
			.replace(/\*\*(.*?)\*\*/g, "$1") // Удаляем **
			.replace(/\*(.*?)\*/g, "$1") // Удаляем *
			.replace(/\[(.*?)\]\((.*?)\)/g, "$1") // Удаляем [text](url)
			.replace(/!\[(.*?)\]\((.*?)\)/g, "") // Удаляем ![alt](url)
			.replace(/#{1,6}\s/g, "") // Удаляем заголовки
			.replace(/`(.*?)`/g, "$1") // Удаляем код
			.replace(/```.*?\n([\s\S]*?)```/g, "$1") // Удаляем блоки кода
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

	const getImageFromContent = (content: string) => {
		const imgMatch =
			content.match(/!\[.*?\]\((.*?)\)/) ||
			content.match(/<img[^>]+src="([^">]+)"/);
		return imgMatch ? imgMatch[1] : null;
	};

	const stripHtml = (html: string) => {
		return html.replace(/<[^>]*>/g, "");
	};

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
						{!imageError && post.coverImage ? (
							<Image
								src={post.coverImage}
								alt={post.project?.name || ""}
								width={240}
								height={240}
								unoptimized
								onError={() => setImageError(true)}
							/>
						) : !contentImageError && getImageFromContent(post.content) ? (
							<Image
								src={getImageFromContent(post.content)!}
								alt={post.project?.name || ""}
								width={240}
								height={240}
								unoptimized
								onError={() => setContentImageError(true)}
							/>
						) : !contentImageError && post.project?.coverImage ? (
							<Image
								src={post.project.coverImage}
								alt={post.project.name}
								width={240}
								height={240}
								unoptimized
								onError={() => setContentImageError(true)}
							/>
						) : (
							<div className={styles.defaultCover}>
								<div className={styles.defaultCoverContent}>
									<div className={styles.defaultCoverInitials}>
										{getInitials(post.project?.name || "")}
									</div>
								</div>
							</div>
						)}
					</div>
					<div className={styles.textContent}>
						<p className={styles.postExcerpt}>
							{truncateText(cleanMarkdown(stripHtml(post.content)), 300)}
						</p>
						<div className={styles.postMeta}>
							<span role="link" tabIndex={0} onClick={handleProjectClick}>
								{post.project?.name}
							</span>
							<span>
								<ClockCircleOutlined style={{ marginRight: 4 }} />
								{dayjs(post.publishedAt).fromNow()}
							</span>
							{post.applauseCount ? (
								<span className={styles.applauseCount}>
									<span
										className={styles.applauseIcon}
										style={{ width: 18, height: 18 }}
									>
										<Lottie
											animationData={applauseDefaultAnimation}
											autoplay={false}
											loop={false}
											className={styles.applauseIconAnimation}
										/>
									</span>
									{post.applauseCount}
								</span>
							) : null}
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

const ProjectDevlogPosts: React.FC<ProjectDevlogPostsProps> = ({
	projectId,
}) => {
	const { t } = useTranslate();

	const { data: projectReports, isLoading } = useQuery({
		queryKey: ["project-reports", projectId],
		queryFn: () =>
			axios.get<DevlogPost[]>(`/api/project/reports`, {
				params: { projectId },
			}),
		enabled: !!projectId,
		refetchOnWindowFocus: false,
	});

	const posts = projectReports?.data || [];

	if (isLoading) {
		return (
			<div className={styles.devlogPostsContainer}>
				<Flex justify="space-between" wrap>
					<Title level={2}>
						<HistoryOutlined style={{ marginRight: 8 }} />
						{t("page.project.last-updates", "Last updates")}
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
					{t("page.project.last-updates", "Last updates")}
				</Title>
			</Flex>

			<div className={styles.postsList}>
				{posts.map((post) => (
					<div key={`post-${post.id}`} className={styles.postWrapper}>
						<PostCard post={post} onClick={(e) => e.stopPropagation()} />
					</div>
				))}
			</div>
		</div>
	);
};

export default ProjectDevlogPosts;
