import HappyProvider from "@ant-design/happy-work-theme/es/HappyProvider";
import { LoadingOutlined } from "@ant-design/icons";
import type { OutputData } from "@editorjs/editorjs";
import type { Project, ProjectReport } from "@gdhub-io/gdhub-prisma";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Skeleton, Spin, Tooltip, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactNiceAvatar from "react-nice-avatar";
import applauseDefaultAnimation from "@/assets/images/icons/applaause-default.json";
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
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

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
	const router = useRouter();
	const { t } = useTranslate();
	const { status: authStatus } = useSession();
	const isUserAuthenticated = authStatus === "authenticated";

	const [applauseCount, setApplauseCount] = useState(post.applauseCount || 0);
	const [hasApplauded, setHasApplauded] = useState(false);
	const [isApplauseLoading, setIsApplauseLoading] = useState(false);
	const [isApplauseStateLoading, setIsApplauseStateLoading] = useState(false);
	const [applauseAnimationToken, setApplauseAnimationToken] = useState(0);
	const applauseRequestIdRef = useRef(0);

	useEffect(() => {
		setApplauseCount(post.applauseCount || 0);
	}, [post.applauseCount]);

	useEffect(() => {
		if (!isUserAuthenticated) {
			setHasApplauded(false);
			setIsApplauseStateLoading(false);
			return;
		}

		let isMounted = true;
		const requestId = ++applauseRequestIdRef.current;
		setIsApplauseStateLoading(true);

		axios
			.get(`/api/devlog/${post.id}/applause`)
			.then(({ data }) => {
				if (!isMounted || requestId !== applauseRequestIdRef.current) return;
				setApplauseCount(data.count || 0);
				setHasApplauded(!!data.hasApplauded);
			})
			.catch((error) => {
				console.error("Error fetching post applause state:", error);
			})
			.finally(() => {
				if (!isMounted || requestId !== applauseRequestIdRef.current) return;
				setIsApplauseStateLoading(false);
			});

		return () => {
			isMounted = false;
		};
	}, [isUserAuthenticated, post.id]);

	const handleApplauseToggle = async (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (!isUserAuthenticated || isApplauseLoading || isApplauseStateLoading) {
			return;
		}

		applauseRequestIdRef.current += 1;

		const nextHasApplauded = !hasApplauded;
		const nextCount = Math.max(0, applauseCount + (nextHasApplauded ? 1 : -1));

		setIsApplauseLoading(true);
		setHasApplauded(nextHasApplauded);
		setApplauseCount(nextCount);
		if (nextHasApplauded) {
			setApplauseAnimationToken((value) => value + 1);
		}

		try {
			const { data } = await axios.request({
				url: `/api/devlog/${post.id}/applause`,
				method: nextHasApplauded ? "POST" : "DELETE",
			});
			setHasApplauded(!!data.hasApplauded);
			setApplauseCount(data.count || 0);
		} catch (error) {
			console.error("Error toggling post applause:", error);
			setHasApplauded(hasApplauded);
			setApplauseCount(applauseCount);
		} finally {
			setIsApplauseLoading(false);
		}
	};

	const handleProjectClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		router.push(`/project/${post.project?.slug}`);
	};

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
						{/* author avatar */}
						{post.author?.image ? (
							<Image
								src={post.author.image}
								alt={post.author?.name || ""}
								width={24}
								height={24}
								style={{ borderRadius: "50%" }}
								unoptimized
							/>
						) : (
							<ReactNiceAvatar
								style={{ width: "24px", height: "24px" }}
								eyeStyle="circle"
								faceColor="#F9C9B6"
								glassesStyle="none"
								mouthStyle="smile"
								hatStyle="none"
							/>
						)}
						<span>{post.author?.name}</span>
						<span>@</span>
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
						<span>{dayjs(post.publishedAt).fromNow()}</span>
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
						<Tooltip
							title={
								isUserAuthenticated
									? t("page.devlog.applauseTooltip", "Rate the team's work")
									: t(
											"page.devlog.applauseAuthTooltip",
											"Only authorized users can leave applause",
										)
							}
						>
							<span className={styles.applauseWrapper}>
								<HappyProvider>
									<Button
										type="text"
										shape="round"
										size="small"
										className={`${styles.applauseButton} ${
											hasApplauded ? styles.applauseButtonActive : ""
										}`}
										icon={
											<span
												className={styles.applauseIcon}
												style={{ width: 18, height: 18 }}
											>
												{isApplauseStateLoading ? (
													<LoadingOutlined
														spin
														style={{ fontSize: 18, lineHeight: 1 }}
													/>
												) : (
													<Lottie
														key={`${hasApplauded ? "active" : "default"}-${applauseAnimationToken}`}
														animationData={applauseDefaultAnimation}
														autoplay={
															hasApplauded && applauseAnimationToken > 0
														}
														loop={false}
														className={styles.applauseIconAnimation}
													/>
												)}
											</span>
										}
										onClick={handleApplauseToggle}
										disabled={
											!isUserAuthenticated ||
											isApplauseLoading ||
											isApplauseStateLoading
										}
									>
										{applauseCount > 0 ? applauseCount : null}
									</Button>
								</HappyProvider>
							</span>
						</Tooltip>
						{!post.isSystem && (
							<PageViews
								path={`/devlog/${post.id}`}
								startDate={post.publishedAt.toString()}
							/>
						)}
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
					<Skeleton.Avatar active size={24} shape="circle" />
					<Skeleton.Input active style={{ width: 180, height: 12 }} />
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

	const hubShell =
		variant === "hub"
			? getHubSectionShellClass(bundleInset ? "inset" : "main")
			: "";

	const useSectionHeader = variant === "hub" && headerStyle !== "title";
	const titleAboveShell = variant === "hub" && headerStyle === "title";

	const headerNode = useSectionHeader ? (
		<HubSectionHeader
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

			{hasNextPage && (
				<div className={styles.loadMore}>
					<Spin spinning={isFetchingNextPage} />
				</div>
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
