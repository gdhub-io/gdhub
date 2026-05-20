"use client";

import { UserOutlined } from "@ant-design/icons";
import { useTranslate } from "@tolgee/react";
import { Button, Card, Typography } from "antd";
import Image from "next/image";
import Link from "next/link";
import { PublicLayout } from "@/layouts/PublicLayout";
import styles from "@/pages/blog/style.module.scss";

const { Text, Title } = Typography;

export interface BlogPost {
	id: string;
	title: string;
	slug: string;
	content: any;
	image?: string;
	publishedAt: string;
	description?: string;
	authors: Array<{
		name: string;
		image?: string;
	}>;
}

export function BlogClient({ posts }: { posts: BlogPost[] }) {
	const { t } = useTranslate();

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toISOString().split("T")[0].split("-").reverse().join("/");
	};

	return (
		<PublicLayout
			title={t("page.blog.title", "Blog")}
			subTitle={t("page.blog.subtitle", "The latest news and articles")}
			seo={{ title: "Blog | gdhub.io" }}
		>
			<div className={styles.container}>
				<div className={styles.posts}>
					{posts.map((post, idx) => {
						const author = post.authors?.[0];
						return (
							<Card className={styles.postCard} key={`post-${idx.toString()}`}>
								{post.image && (
									<div className={styles.coverImage}>
										<Image
											src={post.image}
											alt={post.title}
											width={512}
											height={512}
											style={{
												width: "100%",
												height: "100%",
												objectFit: "cover",
											}}
											className={styles.coverImage}
											priority
										/>
									</div>
								)}
								<div className={styles.postContent}>
									<div className={styles.postTopMeta}>
										<Text className={styles.postDate}>
											{formatDate(post.publishedAt)}
										</Text>
										<div className={styles.authorWrap}>
											{author?.image ? (
												<Image
													src={author.image}
													alt={author.name}
													width={24}
													height={24}
													style={{ borderRadius: "50%" }}
												/>
											) : (
												<UserOutlined style={{ fontSize: "20px" }} />
											)}
										</div>
									</div>
									<Title level={4} className={styles.postTitle}>
										{post.title}
									</Title>
									{post.description && (
										<Text className={styles.postExcerpt}>
											{post.description}
										</Text>
									)}
									<Link href={`/blog/${post.slug}`}>
										<Button
											type="default"
											className="gray-btn"
											style={{ width: "100%" }}
										>
											{t("page.blog.readMore", "Read More")}
										</Button>
									</Link>
								</div>
							</Card>
						);
					})}
				</div>
			</div>
		</PublicLayout>
	);
}
