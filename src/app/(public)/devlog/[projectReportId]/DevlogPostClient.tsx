/* eslint-disable @next/next/no-img-element */

"use client";

import type { OutputBlockData, OutputData } from "@editorjs/editorjs";
import { IconArrowLeft, IconArrowRight, IconClock } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	Image as AntImage,
	Button,
	Card,
	Divider,
	Flex,
	Typography,
} from "antd";
import Blocks from "editorjs-blocks-react-renderer";
import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { ApplauseButton } from "@/components/ApplauseButton";
import { PublicPageHeader } from "@/components/layouts/PublicPageHeader";
import { PublishedDate } from "@/components/PublishedDate";
import { ViewCount } from "@/components/ViewCount";
import { getCleanTextContent } from "@/helpers/content";
import { editorjsRenderers } from "@/helpers/editorjs-renderers";
import { imageSrcSet, optimizedImage } from "@/helpers/image";
import { useContentPageView } from "@/hooks/useContentViews";
import { useDevlogName } from "@/hooks/useDevlogName";
import styles from "./styles.module.scss";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

const { Text } = Typography;

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
	number: number | null;
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

/** Article body column — see the devlog styles `max-width`. */
const CONTENT_IMAGE_SIZES = "(max-width: 800px) 100vw, 800px";

interface PageProps {
	post: Post;
}

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
					src={optimizedImage(src, { width: 1024 })}
					srcSet={imageSrcSet(src)}
					sizes={CONTENT_IMAGE_SIZES}
					alt={alt}
					width={width}
					loading="lazy"
					decoding="async"
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
				src={optimizedImage(src, { width: 1024 })}
				srcSet={imageSrcSet(src)}
				sizes={CONTENT_IMAGE_SIZES}
				alt={alt}
				width={width}
				loading="lazy"
				preview={{
					// The lightbox is the one place the full-size upload is worth it.
					src: optimizedImage(src, { width: 2048 }),
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

export function DevlogPostClient({ post }: PageProps) {
	const { t } = useTranslate();
	const devlogName = useDevlogName();

	useContentPageView("ProjectReport", post.id);

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
		<>
			<PublicPageHeader
				title={devlogName(post.number)}
				subTitle={
					getCleanTextContent(post?.project?.description || "", 100) ||
					undefined
				}
				backgroundImage={post.pageCover || undefined}
				backTo={{
					href: `/project/${post.project?.slug}`,
					label:
						post.project?.name ||
						t("page.devlog.untitledProject", "Game Project"),
				}}
			/>
			<div className="layout-background">
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
								<Text strong>
									{post?.author?.name ||
										t("page.devlog.anonymousAuthor", "Anonymous")}
								</Text>
							</Flex>
							<Flex align="center" gap={16}>
								<ApplauseButton
									subject={{ kind: "devlog", id: post.id }}
									count={post.applauseCount}
								/>
								<ViewCount count={post.viewsCount} />
								<PublishedDate date={post.createdAt} />
							</Flex>
						</Flex>

						<div className={styles.content} style={{ position: "relative" }}>
							{post.video && (
								<div className={styles.video}>
									<ReactPlayer
										src={post.video}
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
											// Check whether there are spaces before and after the img tag
											const isInline =
												(node?.position?.start?.column ?? 0) > 1 &&
												post?.content?.charAt(
													node?.position?.start?.offset ?? 0 - 1,
												) !== "\n" &&
												post?.content?.charAt(
													node?.position?.end?.offset ?? 0,
												) !== "\n";

											// A markdown image without a usable src would render an
											// <img src=""> and make the browser refetch the page.
											if (typeof props.src !== "string" || !props.src) {
												return null;
											}

											return (
												<MarkdownImage
													src={props.src}
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
						</div>
					</Card>
					<div className={styles.postNavigation}>
						{/* TODO(antd6): Divider's "center" orientation became the default; the prop was tightened to "left" | "right" in AntD 6. */}
						<Divider className={styles.postNavigationDivider}>
							<ApplauseButton
								subject={{ kind: "devlog", id: post.id }}
								count={post.applauseCount}
								size="large"
							/>
						</Divider>
						<Flex justify="space-between" align="center" gap={12}>
							<div className={styles.postNavigationSide}>
								{post.previousPost ? (
									<Button
										type="link"
										href={`/devlog/${post.previousPost.id}`}
										icon={<IconArrowLeft />}
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
										icon={<IconArrowRight />}
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
			</div>
		</>
	);
}
