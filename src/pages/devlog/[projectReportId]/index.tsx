/* eslint-disable @next/next/no-img-element */

import {
	ArrowLeftOutlined,
	ClockCircleOutlined,
	LockOutlined,
} from "@ant-design/icons";
import { videoParser } from "@hannal/editorjs-video-plugin";
import { useTranslate } from "@tolgee/react";
import { Image as AntImage, Button, Card, Flex, Space, Typography } from "antd";
import axios from "axios";
import Blocks from "editorjs-blocks-react-renderer";
import type { GetServerSideProps } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { getSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { PageViews } from "@/components/PageViews";
import {
	getCleanTextContent,
	getEditorjsPageCover,
	getEditorjsShortContent,
	getPageCover,
} from "@/helpers/content";
import { PublicLayout } from "@/layouts/PublicLayout";
import styles from "./styles.module.scss";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

const { Text, Title } = Typography;

interface Post {
	id: string;
	title: string;
	content: string;
	contentEditor?: any;
	coverImage?: string;
	createdAt: string;
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
}

interface PageProps {
	post: Post;
	contentLength: number;
	isAuthenticated: boolean;
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (
	context,
) => {
	const projectReportId = context.params?.projectReportId as string;
	const session = await getSession(context);

	if (!projectReportId) {
		return {
			notFound: true,
		};
	}

	try {
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
		const { data: post } = await axios.get(
			`${baseUrl}/api/devlog/${projectReportId}`,
		);

		// Обрезаем контент для неавторизованных пользователей
		if (!session) {
			if (post.contentEditor) {
				// Save page cover before modifying contentEditor
				post.pageCover = getEditorjsPageCover(post.contentEditor);
				// Convert EditorJS content to plain text for unauthorized users
				const shortText = getEditorjsShortContent(post.contentEditor, 1000);
				post.content = shortText;
				// Remove contentEditor so ReactMarkdown is used instead
				delete post.contentEditor;
			} else {
				post.content = getCleanTextContent(post.content, 1000);
				post.pageCover = getPageCover(post);
			}
		}

		console.log(post);

		return {
			props: {
				post,
				contentLength: post.content.length,
				isAuthenticated: !!session,
			},
		};
	} catch (error) {
		console.error("Error fetching post:", error);
		return {
			notFound: true,
		};
	}
};

const MarkdownImage = ({
	src,
	alt,
	width,
	height,
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

export default function ProjectReport({
	post,
	contentLength,
	isAuthenticated,
}: PageProps) {
	const { t } = useTranslate();

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toISOString().split("T")[0].split("-").reverse().join("/");
	};

	const prepareEditorjsData = (data: any) => {
		if (!data || !data.blocks || !Array.isArray(data.blocks)) {
			return { time: Date.now(), blocks: [], version: "2.31.0" };
		}

		const processedBlocks = data.blocks.map((block: any) => {
			if (block && block.type === "video" && block.data) {
				const videoBlock = videoParser?.video(block.data);
				return videoBlock || block;
			}
			return block;
		});

		return {
			time: data.time || Date.now(),
			blocks: processedBlocks,
			version: data.version || "2.31.0",
		};
	};

	if (!post) {
		return null;
	}

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
							<Blocks data={prepareEditorjsData(post.contentEditor)} />
						) : (
							<ReactMarkdown
								rehypePlugins={[
									[rehypeRaw as any],
									[
										rehypeSanitize as any,
										{
											tagNames: [
												"img",
												"u",
												"strong",
												"em",
												"a",
												"p",
												"br",
												"div",
												"span",
											],
											attributes: {
												img: ["src", "alt", "width", "height", "style"],
												a: ["href", "target", "rel"],
												"*": ["style", "className"],
											},
										},
									],
								]}
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
												src={props.src || ""}
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
			</div>
		</PublicLayout>
	);
}
