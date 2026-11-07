"use client";

import type { OutputData } from "@editorjs/editorjs";
import type {
	Project,
	ProjectReport,
	ProjectStatus,
} from "@gdhub-io/gdhub-prisma";
import {
	IconDots,
	IconEdit,
	IconExternalLink,
	IconPlus,
	IconShare3,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTolgee, useTranslate } from "@tolgee/react";
import {
	App,
	Button,
	Dropdown,
	Flex,
	type MenuProps,
	message,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs from "dayjs";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import ModernTable from "@/components/ModernTable";
import { ShareModal, type ShareTarget } from "@/components/ShareModal";
import { ProjectSpace } from "@/components/spaces/ProjectSpace";
import { AppImage } from "@/components/ui/AppImage";
import {
	getCleanTextContent,
	getEditorjsPageCover,
	getEditorjsShortContent,
	getPageCover,
} from "@/helpers/content";
import { devlogTitle } from "@/helpers/devlog";
import { formatCompactCount } from "@/helpers/format";
import { htmlFragmentToPlainText } from "@/helpers/telegramHtml";
import { useCurrentProject } from "@/hooks/project";
import { useDevlogName } from "@/hooks/useDevlogName";
import { devlogOgImage } from "@/services/telegram/messages";
import styles from "./styles.module.scss";

// Editor.js and its plugins stay out of the page's first load.
const DevLogPostModal = dynamic(
	() =>
		import("@/components/modals/DevLogPostModal").then(
			(module) => module.DevLogPostModal,
		),
	{ ssr: false },
);

const { Text } = Typography;

type ProjectReportWithProject = ProjectReport & {
	project: Project;
	applauseCount: number;
};

export default function MyProjectDevlogPage() {
	// `App.useApp()` rather than the static `Modal.confirm`: a detached root
	// cannot see the ConfigProvider above it, so the static dialog ignored the
	// app's theme.
	const { modal } = App.useApp();

	const { t } = useTranslate();
	const { getLanguage } = useTolgee();
	const devlogName = useDevlogName();
	const shareLabel = t("share.label", "Share");
	const [openDevlogPostModal, setOpenDevlogPostModal] = useState(false);
	const { project } = useCurrentProject();
	const [selectedReportId, setSelectedReportId] = useState<string>();
	const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
	const isProjectArchived = project?.status === ("Archived" as ProjectStatus);
	const { can, scopeOf } = useAccess();
	const { data: session } = useSession();

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

	const editPost = (id: string) => {
		setSelectedReportId(id);
		setOpenDevlogPostModal(true);
	};

	const handleDeleteReport = async (id: string) => {
		modal.confirm({
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

	// The same rule the server holds: the founder and admins, any post; a member, their own.
	const mayManage = (record: ProjectReportWithProject) =>
		!isProjectArchived &&
		can("project.devlog.manage") &&
		(scopeOf("project.devlog.manage") !== "own" ||
			record.authorId === session?.user?.id);

	// A post written before the editor has no blocks to open in the composer.
	const canEdit = (record: ProjectReportWithProject) =>
		mayManage(record) && !!record.contentEditor;

	// Feeds hide generated posts, so nobody can have seen or applauded one.
	const countCell = (record: ProjectReportWithProject, count: number) => (
		<Text className={styles.number}>
			{record.isSystem ? "—" : formatCompactCount(count, getLanguage())}
		</Text>
	);

	const columns: ColumnsType<ProjectReportWithProject> = [
		{
			key: "post",
			title: t("page.my-project-devlog.column.post", "Post"),
			render: (_, record) => {
				const coverSrc =
					(record.contentEditor
						? getEditorjsPageCover(
								record.contentEditor as unknown as OutputData,
							)
						: getPageCover(record)) || record.project.coverImage;

				return (
					<Flex align="center" gap={12} className={styles.post}>
						{coverSrc ? (
							<AppImage
								src={coverSrc}
								alt=""
								width={56}
								height={32}
								className={styles.cover}
							/>
						) : (
							<div className={styles.cover} />
						)}
						<Flex vertical className={styles.text}>
							{canEdit(record) ? (
								<Typography.Link
									ellipsis
									className={styles.title}
									onClick={() => editPost(record.id)}
								>
									{devlogName(record.number)}
								</Typography.Link>
							) : (
								<Text ellipsis className={styles.title}>
									{devlogName(record.number)}
								</Text>
							)}
							<Text type="secondary" ellipsis className={styles.excerpt}>
								{record.contentEditor
									? htmlFragmentToPlainText(
											getEditorjsShortContent(
												record.contentEditor as unknown as OutputData,
												500,
											),
										)
									: getCleanTextContent(record.content, 100)}
							</Text>
						</Flex>
					</Flex>
				);
			},
		},
		{
			key: "views",
			title: t("page.my-project-devlog.column.views", "Views"),
			width: 96,
			align: "right",
			responsive: ["md"],
			render: (_, record) => countCell(record, record.viewsCount),
		},
		{
			key: "applause",
			title: t("page.my-project-devlog.column.applause", "Applause"),
			width: 112,
			align: "right",
			responsive: ["md"],
			render: (_, record) => countCell(record, record.applauseCount),
		},
		{
			key: "published",
			title: t("page.my-project-devlog.column.published", "Published"),
			dataIndex: "publishedAt",
			width: 144,
			responsive: ["sm"],
			render: (publishedAt) => (
				<Text type="secondary">{dayjs(publishedAt).format("ll")}</Text>
			),
		},
		{
			key: "actions",
			width: 232,
			align: "right",
			render: (_, record) => {
				const items: MenuProps["items"] = [];

				if (canEdit(record)) {
					items.push({
						key: "edit",
						icon: <IconEdit size={16} />,
						label: t("page.my-project-devlog.action.edit", "Edit"),
						onClick: () => editPost(record.id),
					});
				}
				if (mayManage(record)) {
					items.push({
						key: "delete",
						danger: true,
						icon: <IconTrash size={16} />,
						label: t("page.my-project-devlog.action.delete", "Delete"),
						onClick: () => handleDeleteReport(record.id),
					});
				}

				return (
					<Flex align="center" justify="end" gap={8}>
						{/* Generated posts have no public page to open or share. */}
						{!record.isSystem && (
							<>
								<Button
									size="small"
									href={`/devlog/${record.id}`}
									target="_blank"
									icon={<IconExternalLink size={16} />}
								>
									{t("page.my-project-devlog.action.open", "Go to page")}
								</Button>
								<Button
									type="text"
									size="small"
									aria-label={shareLabel}
									title={shareLabel}
									icon={<IconShare3 size={16} />}
									onClick={() =>
										setShareTarget({
											path: `/devlog/${record.id}`,
											// Plain English, like the OG card: this text leaves the site.
											text: `${devlogTitle(record.project.name, record.number)} on GDHub`,
											image: devlogOgImage(record),
										})
									}
								/>
							</>
						)}
						{!!items.length && (
							<Dropdown
								trigger={["click"]}
								placement="bottomRight"
								menu={{ items }}
							>
								<Button
									type="text"
									size="small"
									aria-label={t(
										"page.my-project-devlog.actions",
										"Post actions",
									)}
									icon={<IconDots size={16} />}
								/>
							</Dropdown>
						)}
					</Flex>
				);
			},
		},
	];

	return (
		<ProjectSpace
			title={t("page.my-project-devlog.title", "Devlog Posts")}
			description={t(
				"page.my-project-devlog.description",
				"Tell the community about your project development progress",
			)}
			actions={
				!isProjectArchived && can("project.devlog.create") ? (
					<Button
						type="primary"
						icon={<IconPlus />}
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
				loading={!project || isFetching}
				rowKey="id"
				dataSource={projectReports}
				columns={columns}
				surface="page"
				tableLayout="fixed"
				scroll={{ x: 480 }}
				pagination={{ hideOnSinglePage: true, showSizeChanger: false }}
				locale={{
					emptyText: (
						<Text type="secondary">
							{t("page.my-project-devlog.empty", "No posts yet")}
						</Text>
					),
				}}
			/>

			{!isProjectArchived && !!project?.id && (
				<DevLogPostModal
					projectId={project.id}
					projectName={project.name}
					// One past the highest number the project still has — what
					// `createNumbered` will give it.
					nextNumber={
						Math.max(0, ...(projectReports ?? []).map((r) => r.number ?? 0)) + 1
					}
					stageName={
						project.workflow?.steps.find(
							(step) => step.id === project.workflow?.currentStepId,
						)?.name
					}
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
			<ShareModal target={shareTarget} onClose={() => setShareTarget(null)} />
		</ProjectSpace>
	);
}
