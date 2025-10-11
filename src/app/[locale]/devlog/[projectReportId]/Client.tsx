"use client";

import { ArrowLeftOutlined, ClockCircleOutlined, LockOutlined } from "@ant-design/icons";
import { useTranslate } from "@tolgee/react";
import { Image as AntImage, Button, Card, Flex, Space, Typography } from "antd";
import dynamic from "next/dynamic";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { PageViews } from "@/components/PageViews";
import { getCleanTextContent } from "@/helpers/content";
import { PublicLayout } from "@/layouts/PublicLayout";
import styles from "./style.module.scss";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

const { Text, Title } = Typography;

export type DevlogPost = {
  id: string;
  title: string;
  content: string;
  coverImage?: string;
  createdAt: string;
  viewsCount: number;
  video?: string;
  author: { name: string; image?: string };
  project?: { name: string; slug: string; description?: string; coverImage?: string };
  pageCover?: string;
};

export default function DevlogReportClient({ post, contentLength, isAuthenticated }: { post: DevlogPost; contentLength: number; isAuthenticated: boolean }) {
  const { t } = useTranslate();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split("T")[0].split("-").reverse().join("/");
  };

  if (!post) return null;

  const subtitle = getCleanTextContent(post?.project?.description || "", 100) || undefined;

  return (
    <PublicLayout
      title={
        <div className={styles.titleContainer}>
          <Link href={`/project/${post.project?.slug}`}>
            <Button type="text" size="small" className={styles.projectTitle}>
              <Space size={0}>
                <ArrowLeftOutlined className="arrow" style={{ color: "#ff4d4f" }} />
                <span style={{ color: "#ff4d4f" }}>{post.project?.name || t("page.devlog.untitledProject", "Game Project")}</span>
              </Space>
            </Button>
          </Link>
          <Title className={styles.title}>{t("page.devlog.title", "Project reports")}</Title>
        </div>
      }
      subTitle={subtitle}
      backgroundImage={post.pageCover || undefined}
      seo={{
        title: `${post.project?.name || "Untitled Project"} - ${t("page.devlog.title", "Project reports")}`,
        description: getCleanTextContent(post?.content || ""),
        openGraph: { images: [{ url: post.pageCover || "", alt: post?.project?.name || "Untitled" }] },
      }}
      styles={{ content: { padding: 0 }, layoutBackground: { padding: 0 } }}
    >
      <div className={styles.container}>
        <Card>
          <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
            <Flex align="center" gap={8}>
              {post?.author?.image && (
                <AntImage src={post.author.image} alt={post.author.name} width={32} height={32} style={{ borderRadius: "50%" }} preview={false} />
              )}
              <Text strong>{post?.author?.name || "Anonymous"}</Text>
            </Flex>
            <Flex align="center" gap={16}>
              <Flex align="center" gap={8}>
                <ClockCircleOutlined style={{ fontSize: 12 }} />
                <Text type="secondary" style={{ fontSize: 12 }}>{post?.createdAt ? formatDate(post.createdAt) : ""}</Text>
              </Flex>
              <PageViews path={`/devlog/${post?.id}`} containerStyle={{ fontSize: 12 }} startDate={post?.createdAt} />
            </Flex>
          </Flex>

          <div className={styles.content}>
            {post.video && (
              <div className={styles.video}>
                <ReactPlayer url={post.video} width="100%" height="100%" controls />
              </div>
            )}
            <ReactMarkdown
              rehypePlugins={[[rehypeRaw as any], [rehypeSanitize as any, { tagNames: ["img", "u", "strong", "em", "a", "p", "br", "div", "span"], attributes: { img: ["src", "alt", "width", "height", "style"], a: ["href", "target", "rel"], "*": ["style", "className"] } }]]}
              components={{
                img: ({ node, ...props }) => (
                  <span className={styles.imagePreview}>
                    <AntImage src={props.src || ""} alt={props.alt || ""} width={props.width as any} preview={{ rootClassName: styles.imagePreview }} />
                  </span>
                ),
              }}
            >
              {post?.content || ""}
            </ReactMarkdown>
            {!isAuthenticated && contentLength > (post?.content?.length || 0) && (
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 300, background: "linear-gradient(to bottom, transparent 0%, transparent 40%, rgba(255,255,255,1) 60%, rgba(255,255,255,1) 100%)", pointerEvents: "none" }} />
                <Card style={{ position: "relative", background: "transparent", border: "none" }}>
                  <Flex align="center" justify="space-between">
                    <Flex align="center" gap={8}>
                      <LockOutlined style={{ fontSize: 18 }} />
                      <Text strong style={{ fontSize: 16, color: "rgba(0,0,0,0.85)" }}>
                        {t("page.devlog.contentLocked", "Full text is available to authorized users")}
                      </Text>
                    </Flex>
                    <Link href="/signin">
                      <Button type="primary">{t("page.devlog.signIn", "Sign in")}</Button>
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


