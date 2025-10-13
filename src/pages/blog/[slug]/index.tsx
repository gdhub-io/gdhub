import { ArrowLeftOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { useTranslate } from "@tolgee/react";
import { Avatar, Button, Card, Flex, Space, Typography } from "antd";
import axios from "axios";
import Blocks from "editorjs-blocks-react-renderer";
import type { GetServerSideProps } from "next";
import Link from "next/link";
import React from "react";
import { PageViews } from "@/components/PageViews";
import { getEditorjsPageCover } from "@/helpers/content";
import { PublicLayout } from "@/layouts/PublicLayout";
import styles from "./style.module.scss";

const { Text, Title } = Typography;

interface BlogPost {
	id: string;
	title: string;
	content: any;
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

interface PageProps {
	post: BlogPost;
}

export const getServerSideProps: GetServerSideProps<PageProps> = async ({
	query,
}) => {
	const slug = query?.slug as string;

	if (!slug) {
		return {
			notFound: true,
		};
	}

	try {
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
		const response = await axios.get(`${baseUrl}/api/blog/${slug}`);
		const post = response.data;

		if (!post || !post.id) {
			console.log("Post not found or invalid:", post);
			return {
				notFound: true,
			};
		}

		return {
			props: {
				post: {
					...post,
					coverImage: post.coverImage || getEditorjsPageCover(post.content),
					content: JSON.stringify(post.content),
					description: post.description,
				},
			},
		};
	} catch (error) {
		console.error("Error fetching blog post:", error);
		return {
			notFound: true,
		};
	}
};

export default function BlogPost({ post }: PageProps) {
	const { t } = useTranslate();

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toISOString().split("T")[0].split("-").reverse().join("/");
	};

	if (!post) {
		return null;
	}

	const author = post.authors?.[0];

	return (
		<>
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
							? [
									{
										url: post.coverImage || "",
										alt: post.title,
									},
								]
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
							{post.content && <Blocks data={JSON.parse(post.content)} />}
						</div>
					</Card>
				</div>
			</PublicLayout>
		</>
	);
}
