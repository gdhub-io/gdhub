import type { ProjectArtifact, User } from "@gdhub-io/gdhub-prisma";
import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
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
import { AppAvatar } from "@/components/ui/AppAvatar";
import { ProjectContext } from "@/contexts/ProjectContext";

const { Text } = Typography;

const CreateArtifactModal = dynamic(
	() => import("@/components/modals/CreateArtifactModal"),
	{
		ssr: false,
	},
);

type ArtifactWithCreatedByUser = ProjectArtifact & {
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

const MyProjectArtifacts = () => {
	const { t } = useTranslate();
	const contextProject = useContext(ProjectContext)?.contextProject;
	const isProjectArchived =
		!contextProject || !!contextProject.isProjectArchived;
	const [showArtifactModal, setShowArtifactModal] = useState(false);

	const {
		data: projectArtifacts,
		refetch: fetchMyProjectArtifacts,
		isLoading: isLoadingMyProjectArtifacts,
	} = useQuery({
		queryKey: ["project-artifacts", contextProject?.id],
		queryFn: () =>
			axios.get("/api/user/project/artifacts", {
				params: { projectId: contextProject?.id },
			}),
		enabled: !!contextProject?.id,
		refetchOnWindowFocus: false,
	});

	const { mutateAsync: deleteArtifact } = useMutation({
		mutationFn: (id: string) =>
			axios.delete(`/api/user/project/artifacts/${id}`),
	});

	const artifactColumns: ColumnsType<ArtifactWithCreatedByUser> = [
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
					<AppAvatar src={data.createdByUser.image} size={24} />
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
						onConfirm={() => handleDeleteArtifact(record.id)}
					>
						<Button type="text" danger>
							<IconTrash />
						</Button>
					</Popconfirm>
				</Space>
			),
		},
	];

	const handleDeleteArtifact = async (id: string) => {
		if (isProjectArchived) return;

		await deleteArtifact(id);
		fetchMyProjectArtifacts();

		message.success(t("project.documents.documentDeleted", "Document deleted"));
	};

	const handleCreateArtifact = () => {
		setShowArtifactModal(false);
		fetchMyProjectArtifacts();
	};

	const handleCancelCreateArtifact = () => {
		setShowArtifactModal(false);
	};

	return (
		<>
			<Flex justify="space-between" align="center">
				<Space align="center">
					{!isProjectArchived && (
						<Button onClick={() => setShowArtifactModal(true)}>
							{t("project.documents.addDocument", "Add document")}
						</Button>
					)}
				</Space>
			</Flex>

			{projectArtifacts?.data.length > 0 ? (
				<ModernTable
					loading={isLoadingMyProjectArtifacts}
					columns={artifactColumns.filter((column) => !column.hidden)}
					dataSource={projectArtifacts?.data?.map(
						(m: ArtifactWithCreatedByUser) => ({
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
				<CreateArtifactModal
					projectId={contextProject?.id}
					open={showArtifactModal}
					onCancel={handleCancelCreateArtifact}
					onCreate={handleCreateArtifact}
				/>
			)}
		</>
	);
};

export default MyProjectArtifacts;
