"use client";

import { ArrowLeftOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { useTranslate } from "@tolgee/react";
import { Avatar, Button, Card, Flex, Space, Typography } from "antd";
import Blocks from "editorjs-blocks-react-renderer";
import Link from "next/link";
import { PageViews } from "@/components/PageViews";
import { editorjsRenderers } from "@/helpers/editorjs-renderers";
import { PublicLayout } from "@/layouts/PublicLayout";
import styles from "./style.module.scss";

const { Text, Title } = Typography;

export interface BlogPost {
	id: string;
	title: string;
	content: string;
	coverImage?: string;
	createdAt: string;
	updatedAt: string;
	publishedAt: string;
	viewsCount?: number;
	slug: string;
	description: string;
	authors: Array<{
		name: string;
		image?: string;
	}>;
}

export function BlogPostClient({ post }: { post: BlogPost }) {
	const { t } = useTranslate();

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toISOString().split("T")[0].split("-").reverse().join("/");
	};

	const author = post.authors?.[0];

	return (
		<PublicLayout
			title={
				<div className={styles.titleContainer}>
					<Link href={`/blog`}>
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
									{t("page.blog.title", "Blog")}
								</span>
							</Space>
						</Button>
					</Link>
					<Title className={styles.title}>{post.title}</Title>
				</div>
			}
			backgroundImage={post.coverImage || undefined}
			seo={{
				title: post.title,
				description: post?.description || undefined,
				openGraph: {
					images: post.coverImage
						? [{ url: post.coverImage, alt: post.title }]
						: [],
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
						<Flex align="center" gap={8} justify="center">
							{author?.image && (
								<Avatar src={author.image} alt={author.name} size={16} />
							)}
							<Text strong style={{ fontSize: "12px" }}>
								{author?.name || "Anonymous"}
							</Text>
						</Flex>
						<Flex align="center" gap={16}>
							<Flex align="center" gap={8}>
								<ClockCircleOutlined style={{ fontSize: "12px" }} />
								<Text type="secondary" style={{ fontSize: "12px" }}>
									{post?.publishedAt ? formatDate(post.publishedAt) : ""}
								</Text>
							</Flex>
							<PageViews
								path={`/blog/${post?.slug}`}
								containerStyle={{ fontSize: "12px" }}
								startDate={post?.publishedAt}
							/>
						</Flex>
					</Flex>

					<div className={styles.content}>
						{post.content && (
							<Blocks
								data={JSON.parse(post.content)}
								renderers={editorjsRenderers}
							/>
						)}
					</div>
				</Card>
			</div>
		</PublicLayout>
	);
}
