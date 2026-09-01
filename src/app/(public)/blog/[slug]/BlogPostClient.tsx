"use client";

import { IconClock } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Card, Flex, Typography } from "antd";
import Blocks from "editorjs-blocks-react-renderer";
import { PublicPageHeader } from "@/components/layouts/PublicPageHeader";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { ViewCount } from "@/components/ViewCount";
import { editorjsRenderers } from "@/helpers/editorjs-renderers";
import { useContentPageView } from "@/hooks/useContentViews";
import styles from "./style.module.scss";

const { Text } = Typography;

export interface BlogPost {
	id: string;
	title: string;
	content: string;
	coverImage?: string;
	createdAt: string;
	updatedAt: string;
	publishedAt: string;
	viewsCount: number;
	slug: string;
	description: string;
	authors: Array<{
		name: string;
		image?: string;
	}>;
}

export function BlogPostClient({ post }: { post: BlogPost }) {
	const { t } = useTranslate();

	useContentPageView("BlogPost", post.id);

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toISOString().split("T")[0].split("-").reverse().join("/");
	};

	const author = post.authors?.[0];

	return (
		<>
			<PublicPageHeader
				title={post.title}
				backgroundImage={post.coverImage || undefined}
				backTo={{ href: "/blog", label: t("page.blog.title", "Blog") }}
			/>
			<div className="layout-background">
				<div className={styles.container}>
					<Card>
						<Flex
							justify="space-between"
							align="center"
							style={{ marginBottom: 24 }}
						>
							<Flex align="center" gap={8} justify="center">
								{author?.image && (
									<AppAvatar src={author.image} alt={author.name} size={16} />
								)}
								<Text strong style={{ fontSize: "12px" }}>
									{author?.name || "Anonymous"}
								</Text>
							</Flex>
							<Flex align="center" gap={16}>
								<Flex align="center" gap={8}>
									<IconClock style={{ fontSize: "12px" }} />
									<Text type="secondary" style={{ fontSize: "12px" }}>
										{post?.publishedAt ? formatDate(post.publishedAt) : ""}
									</Text>
								</Flex>
								<ViewCount
									count={post.viewsCount}
									containerStyle={{ fontSize: "12px" }}
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
			</div>
		</>
	);
}
