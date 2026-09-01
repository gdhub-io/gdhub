/* eslint-disable @next/next/no-img-element */

import type { ProjectReport } from "@gdhub-io/gdhub-prisma";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Flex, List, Space, Typography } from "antd";
import axios from "axios";
import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import ReactPlayer from "react-player";
import rehypeRaw from "rehype-raw";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { imageSrcSet, optimizedImage } from "@/helpers/image";
import { DevLogPost } from "../DevLogWall/DevLogPost";
import styles from "./style.module.scss";

type ProjectReportItem =
	| {
			id: string;
			label?: JSX.Element | string;
			authorId: string;
			children: JSX.Element | string;
			dot?: JSX.Element | string;
	  }[]
	| undefined;

const { Title, Paragraph, Text } = Typography;

/**
 * The devlog wall column. The ladder runs to 2× the widest slot so a retina
 * screen still has a candidate to pick — stopping at 1× is what makes a feed
 * image look washed out.
 */
const WALL_IMAGE_SIZES = "(max-width: 1000px) 100vw, 1000px";
const WALL_IMAGE_WIDTHS = [480, 768, 1024, 1400, 2000];

export const DevLogPublicWall = ({ projectId }: any) => {
	const { t } = useTranslate();

	const { data: projectReports } = useQuery({
		queryKey: ["project-reports", projectId],
		queryFn: () =>
			axios.get<(ProjectReport & { author: Record<string, any> })[]>(
				"/api/project/reports",
				{
					params: { projectId },
				},
			),
		enabled: !!projectId,
		refetchOnWindowFocus: false,
	});

	// const items: ProjectReportItem = useMemo(() => {
	// 	let reports = projectReports?.data.map((report: prismaClient.ProjectReport) => {
	// 		return {
	// 			label: dayjs(report.publishedAt).format('ll'),
	// 			children: (
	// 				<div className={styles.reportItem}>
	// 					<Text>
	// 						<ReactMarkdown rehypePlugins={[rehypeRaw as any]}>{report.content}</ReactMarkdown>
	// 					</Text>
	// 					{!!report.video && <YouTube className={styles.reportVideo} videoId={report.video} />}
	// 				</div>
	// 			),
	// 		}
	// 	})

	// 	if (!reports?.length || !projectReports) return []

	// 	setPosts(reports)

	// 	return reports
	// }, [projectReports])

	const items: ProjectReportItem = useMemo(() => {
		const reports = projectReports?.data.map(
			(report: ProjectReport & { author: Record<string, any> }) => {
				return {
					id: report.id,
					authorId: report.authorId,
					label: (
						<Flex gap={16}>
							<AppAvatar src={report.author.image} size={48} />
							<Space orientation="vertical" size={0}>
								<Text>{report.author.profile.name || report.author.name}</Text>
								<Text type="secondary">
									{report.author.memberInTeams[0]?.position}
								</Text>
							</Space>
						</Flex>
					),
					children: (
						<div className={styles.reportItem}>
							<Paragraph ellipsis={{ rows: 20, expandable: true }}>
								<ReactMarkdown
									rehypePlugins={[rehypeRaw as any]}
									components={{
										img: ({ src, ...props }) => {
											const url = typeof src === "string" ? src : undefined;

											return (
												<img
													style={{ maxWidth: "100%" }}
													{...props}
													alt={props.alt || ""}
													src={optimizedImage(url, { width: 1024 })}
													srcSet={imageSrcSet(url, WALL_IMAGE_WIDTHS)}
													sizes={WALL_IMAGE_SIZES}
													loading="lazy"
													decoding="async"
												/>
											);
										},
									}}
								>
									{report.content}
								</ReactMarkdown>
							</Paragraph>
							{!!report.video && (
								<div className={styles.playerWrapper}>
									<ReactPlayer
										src={report.video}
										light
										width="100%"
										height="100%"
									/>
								</div>
							)}
						</div>
					),
				};
			},
		);

		if (!reports?.length || !projectReports) return [];

		return reports;
	}, [projectReports]);

	if (!projectId || !projectReports?.data || !items?.length) return null;

	return (
		<>
			<Title level={2}>{t("page.devlog.wall.title", "Last updates")}</Title>

			<List
				bordered={false}
				dataSource={items}
				renderItem={(item) => (
					<List.Item>
						<DevLogPost data={item} editable={false} />
					</List.Item>
				)}
			/>
		</>
	);
};
