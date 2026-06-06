/* eslint-disable @next/next/no-img-element */

import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useQuery } from "@tanstack/react-query";
import { Col, List, Row, Spin, Typography } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import ReactPlayer from "react-player";
import rehypeRaw from "rehype-raw";
import DevlogPosts from "../DevlogPosts";
import EditPostModal from "../modals/EditPostModal";
import { DevLogPost } from "./DevLogPost";
import { EmptyDevLog } from "./EmptyDevLog";
import { PostForm } from "./PostForm";
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

const { Title, Paragraph } = Typography;

export const DevLogWall = ({ slug }: { slug: string }) => {
	const [editablePostId, setEditablePostId] = useState<string>();
	const { data: session } = useSession();

	const { data: project } = useQuery({
		queryKey: ["project", slug],
		queryFn: () =>
			axios.get<Partial<prismaClient.Project>>(`/api/user/project`, {
				params: { slug },
			}),
		enabled: !!slug,
	});

	const {
		data: projectReports,
		isLoading,
		refetch,
	} = useQuery({
		queryKey: ["project-reports", slug],
		queryFn: () =>
			axios.get<any[]>("/api/user/project/reports", { params: { slug } }),
		enabled: !!slug,
		refetchInterval: 60000 * 5,
		refetchOnWindowFocus: false,
	});

	const items: ProjectReportItem = useMemo(() => {
		const reports = projectReports?.data.map(
			(report: prismaClient.ProjectReport) => {
				return {
					id: report.id,
					authorId: report.authorId,
					label: dayjs(report.publishedAt).format("ll"),
					children: (
						<div className={styles.reportItem}>
							<Paragraph ellipsis={{ rows: 20, expandable: true }}>
								<ReactMarkdown
									rehypePlugins={[rehypeRaw as any]}
									components={{
										img: (props) => (
											<img
												style={{ maxWidth: "100%" }}
												alt={props.alt || ""}
												{...props}
											/>
										),
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

	if (!project?.data?.id) return null;

	return (
		<>
			<Spin spinning={isLoading}>
				<Row gutter={[32, 16]} justify="center" className={styles.wall}>
					<Col xs={24} sm={20} md={18} lg={16}>
						<DevlogPosts projectId={project?.data?.id} />
						{/* <List
							header={
								<PostForm
									projectId={project?.data.id}
									onCreate={() => refetch()}
								/>
							}
							bordered={false}
							dataSource={items}
							renderItem={(item) => (
								<List.Item>
									<DevLogPost
										data={item}
										onUpdate={setEditablePostId}
										editable={session?.user.id == item.authorId}
									/>
								</List.Item>
							)}
							locale={{
								emptyText: <EmptyDevLog projectName={project?.data?.name} />,
							}}
						/> */}
					</Col>
				</Row>
			</Spin>

			<EditPostModal
				open={!!editablePostId}
				postId={editablePostId}
				onUpdate={() => {
					refetch();
					setEditablePostId(undefined);
				}}
				onCancel={() => setEditablePostId(undefined)}
			/>
		</>
	);
};
