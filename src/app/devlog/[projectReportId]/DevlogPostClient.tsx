/* eslint-disable @next/next/no-img-element */

"use client";

import HappyProvider from "@ant-design/happy-work-theme/es/HappyProvider";
import {
	ArrowLeftOutlined,
	ArrowRightOutlined,
	ClockCircleOutlined,
	LoadingOutlined,
	LockOutlined,
} from "@ant-design/icons";
import type { OutputBlockData, OutputData } from "@editorjs/editorjs";
import { useTranslate } from "@tolgee/react";
import {
	Image as AntImage,
	Button,
	Card,
	Divider,
	Flex,
	Space,
	Tooltip,
	Typography,
} from "antd";
import axios from "axios";
import Blocks from "editorjs-blocks-react-renderer";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import applauseDefaultAnimation from "@/assets/images/icons/applaause-default.json";
import { PageViews } from "@/components/PageViews";
import { getCleanTextContent } from "@/helpers/content";
import { editorjsRenderers } from "@/helpers/editorjs-renderers";
import { PublicLayout } from "@/layouts/PublicLayout";
import styles from "@/pages/devlog/[projectReportId]/styles.module.scss";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

const { Text, Title } = Typography;

interface EditorJsBlock {
	type: OutputBlockData["type"];
	data: OutputBlockData["data"];
}

interface EditorJsData {
	time?: OutputData["time"];
	blocks?: EditorJsBlock[];
	version?: OutputData["version"];
}

interface PreparedEditorJsData {
	time: number;
	blocks: OutputBlockData[];
	version: string;
}

export interface Post {
	id: string;
	title: string;
	content: string;
	contentEditor?: EditorJsData;
	coverImage?: string;
	createdAt: string;
	applauseCount: number;
	viewsCount: number;
	video?: string;
	author: {
		name: string;
		image?: string;
	};
	project?: {
		name: string;
		slug: string;
		description?: string;
		coverImage?: string;
	};
	pageCover?: string;
	previousPost?: {
		id: string;
	} | null;
	nextPost?: {
		id: string;
	} | null;
}

interface PageProps {
	post: Post;
	contentLength: number;
	isAuthenticated: boolean;
}

const ApplauseIcon = ({
	active = false,
	playToken = 0,
	size = 24,
	loading = false,
}: {
	active?: boolean;
	playToken?: number;
	size?: number;
	loading?: boolean;
}) => {
	return (
		<span className={styles.applauseIcon} style={{ width: size, height: size }}>
			{loading ? (
				<LoadingOutlined spin style={{ fontSize: size, lineHeight: 1 }} />
			) : (
				<Lottie
					key={`${active ? "active" : "default"}-${playToken}`}
					animationData={applauseDefaultAnimation}
					autoplay={active && playToken > 0}
					loop={false}
					className={styles.applauseIconAnimation}
				/>
			)}
		</span>
	);
};

const MarkdownImage = ({
	src,
	alt,
	width,
	isInline,
}: {
	src: string;
	alt: string;
	width?: string;
	height?: string;
	isInline?: boolean;
}) => {
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	const containerStyle = {
		display: isInline ? "inline-block" : "block",
		margin: isInline ? "0 8px" : "16px 0",
		verticalAlign: "middle",
	};

	if (!isClient) {
		return (
			<span style={containerStyle}>
				{/* biome-ignore lint/performance/noImgElement: avoid hydration mismatch before AntImage mounts on the client */}
				<img
					src={src}
					alt={alt}
					width={width}
					style={{
						maxWidth: "100%",
						height: "auto",
						borderRadius: "8px",
						verticalAlign: "middle",
					}}
				/>
			</span>
		);
	}

	return (
		<span style={containerStyle} className={styles.imagePreview}>
			<AntImage
				src={src}
				alt={alt}
				width={width}
				preview={{
					rootClassName: styles.imagePreview,
				}}
				style={{
					maxWidth: "100%",
					height: "auto",
					borderRadius: "8px",
					verticalAlign: "middle",
				}}
			/>
		</span>
	);
};

export function DevlogPostClient({
	post,
	contentLength,
	isAuthenticated,
}: PageProps) {
	const { t } = useTranslate();
	const { status: authStatus } = useSession();
	const [applauseCount, setApplauseCount] = useState(post.applauseCount || 0);
	const [hasApplauded, setHasApplauded] = useState(false);
	const [isApplauseLoading, setIsApplauseLoading] = useState(false);
	const [isApplauseStateLoading, setIsApplauseStateLoading] = useState(false);
	const [applauseAnimationToken, setApplauseAnimationToken] = useState(0);
	const applauseRequestIdRef = useRef(0);

	const isUserAuthenticated =
		authStatus === "authenticated" ||
		(authStatus === "loading" && isAuthenticated);

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
				if (!isMounted || requestId !== applauseRequestIdRef.current) {
					return;
				}

				setApplauseCount(data.count || 0);
				setHasApplauded(!!data.hasApplauded);
			})
			.catch((error) => {
				console.error("Error fetching applause state:", error);
			})
			.finally(() => {
				if (!isMounted || requestId !== applauseRequestIdRef.current) {
					return;
				}

				setIsApplauseStateLoading(false);
			});

		return () => {
			isMounted = false;
		};
	}, [isUserAuthenticated, post.id]);

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toISOString().split("T")[0].split("-").reverse().join("/");
	};

	const prepareEditorjsData = (
		data: EditorJsData | undefined,
	): PreparedEditorJsData => {
		if (!data?.blocks || !Array.isArray(data.blocks)) {
			return { time: Date.now(), blocks: [], version: "2.31.0" };
		}

		// Filter out invalid blocks
		const validBlocks = data.blocks.filter((block) => {
			return !!block?.type && block.data !== undefined;
		});

		return {
			time: data.time || Date.now(),
			blocks: validBlocks,
			version: data.version || "2.31.0",
		};
	};

	if (!post) {
		return null;
	}

	const handleApplauseToggle = async () => {
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
			console.error("Error toggling applause:", error);
			setHasApplauded(hasApplauded);
			setApplauseCount(applauseCount);
		} finally {
			setIsApplauseLoading(false);
		}
	};

	const applauseButton = (
		<HappyProvider>
			<Button
				type="text"
				shape="round"
				size="small"
				className={`${styles.applauseButton} ${
					hasApplauded ? styles.applauseButtonActive : ""
				}`}
				icon={
					<ApplauseIcon
						active={hasApplauded}
						playToken={applauseAnimationToken}
						size={22}
						loading={isApplauseStateLoading}
					/>
				}
				onClick={handleApplauseToggle}
				disabled={
					!isUserAuthenticated || isApplauseLoading || isApplauseStateLoading
				}
			>
				{applauseCount > 0 ? applauseCount : null}
			</Button>
		</HappyProvider>
	);

	const applauseBanner = (
		<Tooltip
			title={
				isUserAuthenticated
					? t("page.devlog.applauseTooltip", "Оцени работу команды")
					: t(
							"page.devlog.applauseAuthTooltip",
							"Only authorized users can leave applause",
						)
			}
		>
			<span className={styles.applauseBannerWrapper}>
				<HappyProvider>
					<Button
						type="text"
						size="middle"
						shape="round"
						className={`${styles.applauseBanner} ${
							hasApplauded ? styles.applauseBannerActive : ""
						}`}
						icon={
							<ApplauseIcon
								active={hasApplauded}
								playToken={applauseAnimationToken}
								size={40}
								loading={isApplauseStateLoading}
							/>
						}
						onClick={handleApplauseToggle}
						disabled={
							!isUserAuthenticated ||
							isApplauseLoading ||
							isApplauseStateLoading
						}
					>
						{applauseCount > 0 ? (
							<span className={styles.applauseBannerCount}>
								{applauseCount}
							</span>
						) : null}
					</Button>
				</HappyProvider>
			</span>
		</Tooltip>
	);

	const markdownRehypePlugins = [
		rehypeRaw,
		[
			rehypeSanitize,
			{
				tagNames: ["img", "u", "strong", "em", "a", "p", "br", "div", "span"],
				attributes: {
					img: ["src", "alt", "width", "height", "style"],
					a: ["href", "target", "rel"],
					"*": ["style", "className"],
				},
			},
		],
	] as unknown as ComponentProps<typeof ReactMarkdown>["rehypePlugins"];

	return (
		<PublicLayout
			title={
				<div className={styles.titleContainer}>
					<Link href={`/project/${post.project?.slug}`}>
						<Button
							type="text"
							size="small"
							className={styles.projectTitle}
							onMouseEnter={(e) => {
								const button = e.currentTarget;
								const arrow = button.querySelector(".arrow") as HTMLElement;
								if (arrow) {
									arrow.style.width = "16px";
									arrow.style.marginRight = "8px";
									arrow.style.opacity = "1";
								}
								button.style.paddingLeft = "8px";
								button.style.paddingRight = "8px";
							}}
							onMouseLeave={(e) => {
								const button = e.currentTarget;
								const arrow = button.querySelector(".arrow") as HTMLElement;
								if (arrow) {
									arrow.style.width = "0";
									arrow.style.marginRight = "0";
									arrow.style.opacity = "0";
								}
								button.style.paddingLeft = "0";
								button.style.paddingRight = "0";
							}}
						>
							<Space size={0}>
								<ArrowLeftOutlined
									className="arrow"
									style={{
										width: 0,
										marginRight: 0,
										opacity: 0,
										transition: "all 0.3s ease",
										overflow: "hidden",
										color: "#ff4d4f",
									}}
								/>
								<span style={{ color: "#ff4d4f" }}>
									{post.project?.name ||
										t("page.devlog.untitledProject", "Game Project")}
								</span>
							</Space>
						</Button>
					</Link>
					<Title className={styles.title}>
						{t("page.devlog.title", "Project reports")}
					</Title>
				</div>
			}
			subTitle={
				getCleanTextContent(post?.project?.description || "", 100) || undefined
			}
			backgroundImage={post.pageCover || undefined}
			seo={{
				title: `${post.project?.name || "Untitled Project"} - ${t("page.devlog.title", "Project reports")}`,
				description: getCleanTextContent(post?.content || ""),
				openGraph: {
					images: [
						{
							url: post.pageCover || "",
							alt: post?.project?.name || "Untitled",
						},
					],
				},
			}}
			styles={{ content: { padding: 0 }, layoutBackground: { padding: 0 } }}
		>
			<div className={styles.container}>
				<Card>
					<Flex
						justify="space-between"
						align="center"
						style={{ marginBottom: 24 }}
					>
						<Flex align="center" gap={8}>
							{post?.author?.image && (
								<AntImage
									src={post.author.image}
									alt={post.author.name}
									width={32}
									height={32}
									style={{ borderRadius: "50%" }}
									preview={false}
								/>
							)}
							<Text strong>{post?.author?.name || "Аноним"}</Text>
						</Flex>
						<Flex align="center" gap={16}>
							<Tooltip
								title={
									isUserAuthenticated
										? undefined
										: t(
												"page.devlog.applauseAuthTooltip",
												"Only authorized users can leave applause",
											)
								}
							>
								<span className={styles.applauseTooltipWrapper}>
									{applauseButton}
								</span>
							</Tooltip>
							<Flex align="center" gap={8}>
								<ClockCircleOutlined style={{ fontSize: "12px" }} />
								<Text type="secondary" style={{ fontSize: "12px" }}>
									{post?.createdAt ? formatDate(post.createdAt) : ""}
								</Text>
							</Flex>
							<PageViews
								path={`/devlog/${post?.id}`}
								containerStyle={{ fontSize: "12px" }}
								startDate={post?.createdAt}
							/>
						</Flex>
					</Flex>

					<div className={styles.content} style={{ position: "relative" }}>
						{post.video && (
							<div className={styles.video}>
								<ReactPlayer
									url={post.video}
									width="100%"
									height="100%"
									controls
								/>
							</div>
						)}

						{post.contentEditor ? (
							<Blocks
								data={prepareEditorjsData(post.contentEditor)}
								renderers={editorjsRenderers}
							/>
						) : (
							<ReactMarkdown
								rehypePlugins={markdownRehypePlugins}
								components={{
									img: ({ node, ...props }) => {
										// Проверяем, есть ли пробелы до и после тега img
										const isInline =
											(node?.position?.start?.column ?? 0) > 1 &&
											post?.content?.charAt(
												node?.position?.start?.offset ?? 0 - 1,
											) !== "\n" &&
											post?.content?.charAt(
												node?.position?.end?.offset ?? 0,
											) !== "\n";

										return (
											<MarkdownImage
												src={typeof props.src === "string" ? props.src : ""}
												alt={props.alt || ""}
												width={props.width as string}
												height={props.height as string}
												isInline={isInline}
											/>
										);
									},
									p: ({ node, ...props }) => (
										<p
											{...props}
											style={{
												margin: "16px 0",
												lineHeight: "1.6",
												whiteSpace: "pre-wrap",
											}}
										/>
									),
									ul: ({ node, ...props }) => (
										<ul
											{...props}
											style={{
												margin: "16px 0",
												paddingLeft: "24px",
											}}
										/>
									),
									li: ({ node, ...props }) => (
										<li
											{...props}
											style={{
												margin: "8px 0",
											}}
										/>
									),
									u: ({ node, ...props }) => (
										<u
											{...props}
											style={{
												textDecoration: "underline",
											}}
										/>
									),
								}}
							>
								{post?.content || ""}
							</ReactMarkdown>
						)}
						{!isAuthenticated && contentLength > post?.content?.length && (
							<div
								style={{
									position: "absolute",
									bottom: 0,
									left: 0,
									right: 0,
									height: "300px",
									background:
										"linear-gradient(to bottom, transparent 0%, transparent 40%, rgba(255, 255, 255, 1) 60%, rgba(255, 255, 255, 1) 100%)",
									pointerEvents: "none",
								}}
							>
								<Card
									style={{
										position: "absolute",
										bottom: 0,
										left: 0,
										right: 0,
										background: "transparent",
										border: "none",
										pointerEvents: "auto",
									}}
								>
									<Flex align="center" justify="space-between">
										<Flex align="center" gap={8}>
											<LockOutlined style={{ fontSize: "18px" }} />
											<Text
												strong
												style={{
													fontSize: "16px",
													color: "rgba(0, 0, 0, 0.85)",
												}}
											>
												{t(
													"page.devlog.contentLocked",
													"Full text is available to authorized users",
												)}
											</Text>
										</Flex>
										<Link href="/signin">
											<Button type="primary">
												{t("page.devlog.signIn", "Sign in")}
											</Button>
										</Link>
									</Flex>
								</Card>
							</div>
						)}
					</div>
				</Card>
				<div className={styles.postNavigation}>
					{/* TODO(antd6): Divider's "center" orientation became the default; the prop was tightened to "left" | "right" in AntD 6. */}
					<Divider className={styles.postNavigationDivider}>
						{applauseBanner}
					</Divider>
					<Flex justify="space-between" align="center" gap={12}>
						<div className={styles.postNavigationSide}>
							{post.previousPost ? (
								<Button
									type="link"
									href={`/devlog/${post.previousPost.id}`}
									icon={<ArrowLeftOutlined />}
								>
									{t("page.devlog.previousPost", "Previous post")}
								</Button>
							) : (
								<span />
							)}
						</div>
						<div className={styles.postNavigationSide}>
							{post.nextPost ? (
								<Button
									type="link"
									href={`/devlog/${post.nextPost.id}`}
									iconPosition="end"
									icon={<ArrowRightOutlined />}
								>
									{t("page.devlog.nextPost", "Next post")}
								</Button>
							) : (
								<span />
							)}
						</div>
					</Flex>
				</div>
			</div>
		</PublicLayout>
	);
}
