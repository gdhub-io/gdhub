import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { HiOutlineTrash } from "@react-icons/all-files/hi/HiOutlineTrash";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Alert,
	Avatar,
	Button,
	Flex,
	message,
	Popconfirm,
	Space,
	Tabs,
	Tooltip,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs from "dayjs";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useContext, useState } from "react";
import ProjectLegalContent from "@/components/legal/ProjectLegalContent";
import ModernTable from "@/components/ModernTable";
import {
	DEFAULT_DAMAGE_COMPENSATION_AMOUNT,
	DEFAULT_DAMAGE_COMPENSATION_CURRENCY,
	DEFAULT_MENTOR_FUND_SHARE,
	PLATFORM_SHARE_PERCENT,
} from "@/config/legal";
import { ProjectContext } from "@/contexts/ProjectContext";
import { useCurrentProject } from "@/hooks/project";

const { Text } = Typography;

const CreateDocumentModal = dynamic(
	() => import("@/components/modals/CreateDocumentModal"),
	{
		ssr: false,
	},
);

type TeamDocumentWithCreatedByUser = prismaClient.TeamDocument & {
	createdByUser: prismaClient.User;
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
	const [showDocumentModal, setShowDocumentModal] = useState(false);
	const [activeTab, setActiveTab] = useState("documents");
	const { project } = useCurrentProject();
	const usesCoDevelopmentAgreement = Boolean(
		project?.usesCoDevelopmentAgreement ?? project?.agree,
	);

	const {
		data: projectDocuments,
		refetch: fetchMyProjectDocuments,
		isLoading: isLoadingMyProjectDocuments,
	} = useQuery({
		queryKey: ["project-team-documents", contextProject?.teamId],
		queryFn: () =>
			axios.get("/api/user/project/documents", {
				params: { teamId: contextProject?.teamId },
			}),
		enabled: !!contextProject?.teamId,
		refetchOnWindowFocus: false,
	});

	const { data: projectEquity } = useQuery({
		queryKey: ["project-equity-documents", contextProject?.id],
		queryFn: () =>
			axios.get("/api/user/project/equity", {
				params: { projectId: contextProject?.id },
			}),
		enabled: !!contextProject?.id && usesCoDevelopmentAgreement,
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
				<Space direction="vertical" size={0}>
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
			render: (_value, record) => (
				<Space>
					<Popconfirm
						title={t("You definitely want to delete the document?")}
						okText={t("Yes", "Yes")}
						cancelText={t("No", "No")}
						onConfirm={() =>
							handleDeleteDocument({
								id: record.id,
								teamId: contextProject?.teamId,
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
					{activeTab === "documents" ? (
						<Button onClick={() => setShowDocumentModal(true)}>
							{t("project.documents.addDocument", "Add document")}
						</Button>
					) : null}
				</Space>
			</Flex>

			<Tabs
				activeKey={activeTab}
				onChange={setActiveTab}
				items={[
					{
						key: "documents",
						label: t("project.documents.tab.documents", "Project documents"),
						children:
							projectDocuments?.data.length > 0 ? (
								<ModernTable
									loading={isLoadingMyProjectDocuments}
									columns={documentsColumns}
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
							),
					},
					{
						key: "legal",
						label: t("project.documents.tab.legal", "Legal"),
						children: usesCoDevelopmentAgreement ? (
							<ProjectLegalContent
								title={t(
									"project.documents.legalTitle",
									"Legal documents and agreement",
								)}
								showDownload
								showProjectAppendix
								appendixInput={{
									projectName:
										contextProject?.name || project?.name || "Project",
									projectId: contextProject?.id || project?.id,
									projectSlug: project?.slug,
									agreementDate: project?.createdAt,
									platformShare:
										projectEquity?.data?.platformShare ??
										PLATFORM_SHARE_PERCENT,
									mentorFundShare:
										projectEquity?.data?.mentorFundShare ??
										DEFAULT_MENTOR_FUND_SHARE,
									damageCompensationEnabled:
										project?.damageCompensationEnabled ?? true,
									damageCompensationAmount:
										project?.damageCompensationAmount ??
										DEFAULT_DAMAGE_COMPENSATION_AMOUNT,
									damageCompensationCurrency:
										project?.damageCompensationCurrency ??
										DEFAULT_DAMAGE_COMPENSATION_CURRENCY,
								}}
							/>
						) : (
							<Alert
								type="info"
								message={t(
									"project.documents.legalDisabled",
									"This project was created without a co-development agreement.",
								)}
								description={t(
									"project.documents.legalDisabledDescription",
									"The legal agreement is available only for projects where co-development mode was enabled.",
								)}
							/>
						),
					},
				]}
			/>

			<CreateDocumentModal
				teamId={contextProject?.teamId}
				projectId={contextProject?.id}
				open={showDocumentModal}
				onCancel={handleCancelCreateDocument}
				onCreate={handleCreateDocument}
			/>
		</>
	);
};

export default MyProjectDocuments;
