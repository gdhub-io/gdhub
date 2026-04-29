import { PlusOutlined } from "@ant-design/icons";
import type { OutputData } from "@editorjs/editorjs";
import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IconEdit, IconEye, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { T, useTranslate } from "@tolgee/react";
import { Button, Modal, message, Space, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs from "dayjs";
import Image from "next/image";
import { useMemo, useState } from "react";
import ModernTable from "@/components/ModernTable";
import { DevLogPostModal } from "@/components/modals/DevLogPostModal";
import { PageViews } from "@/components/PageViews";
import {
	getCleanTextContent,
	getEditorjsPageCover,
	getEditorjsShortContent,
	getPageCover,
} from "@/helpers/content";
import { htmlFragmentToPlainText } from "@/helpers/telegramHtml";
import { useCurrentProject } from "@/hooks/project";
import { ProtectedProjectLayout } from "@/layouts/ProtectedProjectLayout";
import type { NextPageWithLayout } from "@/pages/_app";

const { Text } = Typography;

type ProjectReportWithProject = prismaClient.ProjectReport & {
	project: prismaClient.Project;
};

const MyProjectPage: NextPageWithLayout = () => {
	const { t } = useTranslate();
	const [openDevlogPostModal, setOpenDevlogPostModal] = useState(false);
	const { project } = useCurrentProject();
	const [selectedReportId, setSelectedReportId] = useState<string>();
	const isProjectArchived =
		project?.status === ("Archived" as prismaClient.ProjectStatus);

	const {
		data: projectReports,
		refetch: refetchProjectReports,
		isFetching,
	} = useQuery<ProjectReportWithProject[]>({
		queryKey: ["project-reports", project?.id],
		queryFn: () =>
			axios
				.get<ProjectReportWithProject[]>("/api/user/project/reports", {
					params: { projectId: project?.id },
				})
				.then((res) => res.data),
		enabled: !!project?.id,
		refetchOnWindowFocus: false,
	});

	const { mutateAsync: deleteProjectReport } = useMutation({
		mutationFn: (id: string) =>
			axios.delete<void>("/api/user/project/report", { params: { id } }),
	});

	const handleDeleteReport = async (id: string) => {
		if (isProjectArchived) return;

		Modal.confirm({
			title: t(
				"modal.dev-log-post.delete-confirm",
				"Are you sure you want to delete this report?",
			),
			okText: t("modal.dev-log-post.delete-confirm-yes", "Yes"),
			cancelText: t("modal.dev-log-post.delete-confirm-no", "No"),
			onOk: async () => {
				await deleteProjectReport(id);

				message.success(
					t("modal.dev-log-post.report-deleted", "Report deleted"),
				);

				refetchProjectReports();
			},
		});
	};

	const columns: ColumnsType<ProjectReportWithProject> = useMemo(
		() => [
			{
				title: "Cover",
				dataIndex: "id",
				key: "id",
				render: (_, record) => {
					const coverSrc =
						(record.contentEditor
							? getEditorjsPageCover(
									record.contentEditor as unknown as OutputData,
								)
							: getPageCover(record)) || record.project.coverImage;

					return (
						<Image
							src={coverSrc || ""}
							alt="Cover"
							width={80}
							height={45}
							style={{
								width: "100%",
								height: "100%",
								objectFit: "cover",
								borderRadius: 8,
								aspectRatio: 16 / 9,
							}}
						/>
					);
				},
			},
			{
				title: "Content",
				dataIndex: "contentEditor",
				key: "content",
				width: "50%",
				render: (contentEditor, record) =>
					contentEditor ? (
						<Text ellipsis style={{ maxWidth: "240px" }}>
							{htmlFragmentToPlainText(
								getEditorjsShortContent(
									contentEditor as unknown as OutputData,
									500,
								),
							)}
						</Text>
					) : (
						<Text ellipsis style={{ maxWidth: "240px" }}>
							{getCleanTextContent(record.content, 100)}
						</Text>
					),
			},
			{
				title: "Published At",
				dataIndex: "publishedAt",
				render: (publishedAt) => dayjs(publishedAt).format("ll"),
			},
			{
				title: "Views",
				dataIndex: "id",
				key: "views",
				render: (id, record) => (
					<PageViews
						path={`/devlog/${id}`}
						startDate={dayjs(record.publishedAt).format("YYYY-MM-DD")}
						minViews={0}
					/>
				),
			},
			{
				title: "Actions",
				dataIndex: "id",
				key: "actions",
				align: "right",
				render: (id, record) => (
					<Space>
						<Button
							type="link"
							size="small"
							href={`/devlog/${id}`}
							target="_blank"
							icon={<IconEye size={16} />}
						>
							View
						</Button>
						{!isProjectArchived && !!record.contentEditor && (
							<Button
								type="link"
								size="small"
								icon={<IconEdit size={16} />}
								onClick={() => {
									setSelectedReportId(id);
									setOpenDevlogPostModal(true);
								}}
							>
								Edit
							</Button>
						)}
						{!isProjectArchived && (
							<Button
								type="link"
								size="small"
								icon={<IconTrash size={16} />}
								onClick={() => handleDeleteReport(id)}
							>
								<T keyName="delete" />
							</Button>
						)}
					</Space>
				),
			},
		],
		[t, isProjectArchived],
	);

	return (
		<ProtectedProjectLayout
			title={t("page.my-project-devlog.title", "Project Devlog")}
			description={t(
				"page.my-project-devlog.description",
				"Tell the world about your project development progress",
			)}
			actions={
				!isProjectArchived ? (
					<Button
						type="primary"
						icon={<PlusOutlined />}
						onClick={() => {
							setOpenDevlogPostModal(true);
						}}
					>
						{t("modal.dev-log-post.add-post", "Add post")}
					</Button>
				) : null
			}
		>
			<ModernTable<ProjectReportWithProject>
				loading={isFetching}
				rowKey="id"
				dataSource={projectReports}
				columns={columns}
				scroll={{ x: "max-content" }}
			/>

			{!isProjectArchived && !!project?.id && (
				<DevLogPostModal
					projectId={project.id}
					postId={selectedReportId}
					open={openDevlogPostModal}
					onClose={() => {
						setOpenDevlogPostModal(false);
						setSelectedReportId(undefined);
					}}
					onSave={() => {
						setOpenDevlogPostModal(false);
						setSelectedReportId(undefined);
						refetchProjectReports();
					}}
				/>
			)}
		</ProtectedProjectLayout>
	);
};

export default MyProjectPage;
