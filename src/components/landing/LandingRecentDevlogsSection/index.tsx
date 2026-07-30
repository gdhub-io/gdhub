/* eslint-disable @next/next/no-img-element */

import type { OutputData } from "@editorjs/editorjs";
import type { Project, ProjectReport } from "@gdhub-io/gdhub-prisma";
import { useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Card, Col, Grid, Row, Skeleton, Space, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import Image from "next/image";
import Link from "next/link";
import {
	getCleanTextContent,
	getEditorjsPageCover,
	getEditorjsShortContent,
	getPageCover,
} from "@/helpers/content";
import { htmlFragmentToPlainText } from "@/helpers/telegramHtml";
import styles from "./style.module.scss";

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

const getInitials = (title: string): string => {
	if (!title) return "";
	return title
		.split(" ")
		.map((word) => word[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
};

export const LandingRecentDevlogsSection = () => {
	const { t } = useTranslate();

	// Use real data
	const { data: recentDevlogs, isLoading } = useQuery({
		queryKey: ["recent-devlogs"],
		queryFn: () => axios.get("/api/landing/project-reports"),
	});

	return (
		<div
			className={styles.section}
			id={`recent-devlogs-${Math.random().toString(36).substring(2, 15)}`}
		>
			<div className={styles.container}>
				<div className={styles.preTitle}>
					{t("landing.devlogs.pretitle", "Active Development")}
				</div>
				<Title level={2}>{t("landing.devlogs.title", "Recent Devlogs")}</Title>
				<Paragraph className={styles.description}>
					{t(
						"landing.devlogs.description",
						"Follow the progress of game development on our platform. Developers regularly share updates about their projects.",
					)}
				</Paragraph>

				<div className={styles.devlogsContainer}>
					{isLoading ? (
						<Row gutter={[24, 24]}>
							{[1, 2, 3].map((index: number) => (
								<Col key={index} xs={24} sm={12} md={8}>
									<Card className={styles.devlogCard}>
										<Skeleton.Image
											active
											style={{ width: "100%", height: 200 }}
										/>
										<Skeleton active paragraph={{ rows: 4 }} />
									</Card>
								</Col>
							))}
						</Row>
					) : (
						<Row gutter={[24, 24]}>
							{recentDevlogs?.data?.map(
								(
									devlog: ProjectReport & {
										project: Project;
									},
								) => {
									const pageCoverFromContent = getPageCover({
										content: devlog.content,
										video: devlog.video,
										project: devlog.project,
									});

									const pageCoverFromEditorjs = devlog.contentEditor
										? getEditorjsPageCover(
												devlog.contentEditor as unknown as OutputData,
											)
										: null;

									const initials = getInitials(devlog.project?.name || "");

									return (
										<Col key={devlog.id} xs={24} sm={12} md={8}>
											<Link href={`/devlog/${devlog.id}`}>
												<Card className={styles.devlogCard}>
													{pageCoverFromEditorjs || pageCoverFromContent ? (
														<div className={styles.cardImage}>
															<Image
																src={
																	pageCoverFromEditorjs ||
																	pageCoverFromContent ||
																	""
																}
																alt={devlog.project?.name || ""}
																width={240}
																height={240}
																unoptimized
																className={styles.image}
															/>
														</div>
													) : (
														<div className={styles.defaultCover}>
															<div className={styles.defaultCoverContent}>
																<span className={styles.defaultCoverInitials}>
																	{initials}
																</span>
															</div>
														</div>
													)}
													<div className={styles.cardHeader}>
														<Space
															orientation="vertical"
															size={4}
															className={styles.projectInfo}
														>
															<Text strong>{devlog.project?.name}</Text>
															<Text type="secondary">
																{dayjs(devlog.publishedAt).format(
																	"MMMM D, YYYY",
																)}
															</Text>
														</Space>
													</div>
													<div className={styles.cardContent}>
														<Text>
															{htmlFragmentToPlainText(
																getEditorjsShortContent(
																	devlog.contentEditor as unknown as OutputData,
																	150,
																),
															)}
														</Text>
													</div>
												</Card>
											</Link>
										</Col>
									);
								},
							)}
						</Row>
					)}
				</div>
			</div>
		</div>
	);
};
