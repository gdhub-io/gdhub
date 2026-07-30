import type { TeamDocument, User } from "@gdhub-io/gdhub-prisma";
import { HiOutlineTrash } from "@react-icons/all-files/hi/HiOutlineTrash";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Avatar,
	Button,
	Flex,
	message,
	Popconfirm,
	Space,
	Tooltip,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs from "dayjs";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useContext, useState } from "react";
import ModernTable from "@/components/ModernTable";
import { ProjectContext } from "@/contexts/ProjectContext";

const { Text } = Typography;

const CreateDocumentModal = dynamic(
	() => import("@/components/modals/CreateDocumentModal"),
	{
		ssr: false,
	},
);

type TeamDocumentWithCreatedByUser = TeamDocument & {
	createdByUser: User;
};

const LinkPreviewText = ({ link }: { link: string }) => {
	const previewLength = 20;

	return (
		<Tooltip title={link} popupVisible={false}>
			<Text
				ellipsis
				type="secondary"
				style={{ maxWidth: "250px", fontSize: 12 }}
			>
				{[
					link.slice(0, previewLength),
					link.slice(link.length - previewLength),
				].join(" ... ")}
			</Text>
		</Tooltip>
	);
};

const MyProjectDocuments = () => {
	const { t } = useTranslate();
	const contextProject = useContext(ProjectContext)?.contextProject;
	const isProjectArchived =
		!contextProject || !!contextProject.isProjectArchived;
	const [showDocumentModal, setShowDocumentModal] = useState(false);

	const {
		data: projectDocuments,
		refetch: fetchMyProjectDocuments,
		isLoading: isLoadingMyProjectDocuments,
	} = useQuery({
		queryKey: ["project-team-documents", contextProject?.team?.id],
		queryFn: () =>
			axios.get("/api/user/project/documents", {
				params: { teamId: contextProject?.team?.id },
			}),
		enabled: !!contextProject?.team?.id,
		refetchOnWindowFocus: false,
	});

	const { mutateAsync: deleteDocument } = useMutation({
		mutationFn: ({ id, teamId }: { id: string; teamId: string }) =>
			axios.delete(`/api/user/project/documents/${id}`, {
				params: { teamId },
			}),
	});

	const documentsColumns: ColumnsType<TeamDocumentWithCreatedByUser> = [
		{
			title: t("project.documents.title", "Title"),
			dataIndex: "name",
			key: "name",
			width: "30%",
			ellipsis: true,
			render: (value, data) => (
				<Space orientation="vertical" size={0}>
					<Text strong>
						<Link href={data.link} target="_blank">
							{value}
						</Link>
					</Text>
					<LinkPreviewText link={data.link} />
				</Space>
			),
		},
		{
			title: t("project.documents.description", "Description"),
			dataIndex: "description",
			key: "description",
			ellipsis: true,
			responsive: ["md"],
			width: "30%",
			render: (value) => (
				<Text ellipsis type="secondary" style={{ maxWidth: "120px" }}>
					{value}
				</Text>
			),
		},
		{
			title: t("project.documents.type", "Added by"),
			dataIndex: ["createdByUser", "name"],
			key: "createdByUser",
			responsive: ["md"],
			width: "20%",
			render: (value, data) => (
				<Space align="center" size={8}>
					<Avatar src={data.createdByUser.image} size={24} />
					<Text>{value}</Text>
				</Space>
			),
		},
		{
			title: t("project.documents.updatedAt", "Updated At"),
			dataIndex: "updatedAt",
			key: "updatedAt",
			align: "right",
			responsive: ["md"],
			width: "20%",
			render: (value) => dayjs(value).format("LLL"),
		},
		{
			key: "actions",
			width: "1%",
			hidden: isProjectArchived,
			render: (value, record) => (
				<Space>
					<Popconfirm
						title={t("You definitely want to delete the document?")}
						okText={t("Yes", "Yes")}
						cancelText={t("No", "No")}
						onConfirm={() =>
							handleDeleteDocument({
								id: record.id,
								teamId: contextProject?.team?.id,
							})
						}
					>
						<Button type="text" danger>
							<HiOutlineTrash />
						</Button>
					</Popconfirm>
				</Space>
			),
		},
	];

	const handleDeleteDocument = async ({
		id,
		teamId,
	}: {
		id: string;
		teamId?: string;
	}) => {
		if (!teamId) return;
		if (isProjectArchived) return;

		await deleteDocument({ id, teamId });
		fetchMyProjectDocuments();

		message.success(t("project.documents.documentDeleted", "Document deleted"));
	};

	const handleCreateDocument = () => {
		setShowDocumentModal(false);
		fetchMyProjectDocuments();
	};

	const handleCancelCreateDocument = () => {
		setShowDocumentModal(false);
	};

	return (
		<>
			<Flex justify="space-between" align="center">
				<Space align="center">
					{!isProjectArchived && (
						<Button onClick={() => setShowDocumentModal(true)}>
							{t("project.documents.addDocument", "Add document")}
						</Button>
					)}
				</Space>
			</Flex>

			{projectDocuments?.data.length > 0 ? (
				<ModernTable
					loading={isLoadingMyProjectDocuments}
					columns={documentsColumns.filter((column) => !column.hidden)}
					dataSource={projectDocuments?.data?.map(
						(m: TeamDocumentWithCreatedByUser) => ({
							...m,
							key: m.id,
						}),
					)}
					pagination={false}
				/>
			) : (
				<p style={{ marginTop: 12, color: "gray" }}>
					{t(
						"project.documents.noDocuments",
						"There are no documents at the moment",
					)}
				</p>
			)}

			{!isProjectArchived && (
				<CreateDocumentModal
					teamId={contextProject?.team?.id}
					projectId={contextProject?.id}
					open={showDocumentModal}
					onCancel={handleCancelCreateDocument}
					onCreate={handleCreateDocument}
				/>
			)}
		</>
	);
};

export default MyProjectDocuments;
