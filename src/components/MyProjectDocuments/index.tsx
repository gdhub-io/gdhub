import {
	DownloadOutlined,
	EllipsisOutlined,
	EyeOutlined,
	HistoryOutlined,
	LinkOutlined,
} from "@ant-design/icons";
import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Avatar,
	Button,
	Dropdown,
	Flex,
	type MenuProps,
	message,
	Space,
	Tooltip,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import dayjs from "dayjs";
import dynamic from "next/dynamic";
import { useContext, useMemo, useState } from "react";
import ProjectLegalHistoryModal from "@/components/legal/ProjectLegalHistoryModal";
import ProjectLegalPreviewModal from "@/components/legal/ProjectLegalPreviewModal";
import ModernTable from "@/components/ModernTable";
import {
	DEFAULT_DAMAGE_COMPENSATION_AMOUNT,
	DEFAULT_DAMAGE_COMPENSATION_CURRENCY,
	DEFAULT_MENTOR_FUND_SHARE,
	PLATFORM_SHARE_PERCENT,
} from "@/config/legal";
import { ProjectContext } from "@/contexts/ProjectContext";
import {
	buildProjectLegalSnapshotMarkdown,
	type ProjectLegalSnapshotInput,
} from "@/helpers/legal/projectLegalSnapshot";
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

type ProjectLegalHistoryResponse = {
	activeLegalSnapshotId: string | null;
	snapshots: Array<{
		id: string;
		title: string;
		templateVersion: number;
		status: prismaClient.ProjectLegalSnapshotStatus;
		params: unknown;
		createdAt: string;
		supersededAt: string | null;
		createdBy: {
			id: string;
			name: string | null;
			image: string | null;
		};
	}>;
	events: Array<{
		id: string;
		type: prismaClient.ProjectLegalEventType;
		payload: unknown;
		effectiveAt: string | null;
		createdAt: string;
		snapshotId: string | null;
		actorUser: {
			id: string;
			name: string | null;
			image: string | null;
		} | null;
		subjectUser: {
			id: string;
			name: string | null;
			image: string | null;
		} | null;
		subjectTeamMember: {
			id: string;
			status: prismaClient.TeamMemberStatus;
			user: {
				id: string;
				name: string | null;
				image: string | null;
			} | null;
		} | null;
	}>;
};

type ProjectDocumentRow =
	| {
			key: string;
			kind: "legal";
			name: string;
			description: string;
			createdBy: {
				name: string;
				image: string | null;
			};
			createdAt: string | Date | null | undefined;
			updatedAt: string | Date | null | undefined;
	  }
	| {
			key: string;
			kind: "external";
			id: string;
			type: prismaClient.TeamDocumentType;
			name: string;
			description?: string | null;
			link: string;
			createdBy: {
				name: string | null;
				image: string | null;
			};
			createdAt: string | Date;
			updatedAt: string | Date;
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

const getDocumentTypeLabel = (type?: prismaClient.TeamDocumentType) => {
	switch (type) {
		case prismaClient.TeamDocumentType.Concept:
			return "Concept Document";
		case prismaClient.TeamDocumentType.GDD:
			return "Game Design Document";
		case prismaClient.TeamDocumentType.NDA:
			return "NDA";
		case prismaClient.TeamDocumentType.JDA:
			return "JDA";
		default:
			return "Other";
	}
};

const formatDocumentDate = (value?: string | Date | null) => {
	if (!value) {
		return "—";
	}

	return dayjs(value).format("LLL");
};

const MyProjectDocuments = () => {
	const { t } = useTranslate();
	const contextProject = useContext(ProjectContext)?.contextProject;
	const [showDocumentModal, setShowDocumentModal] = useState(false);
	const [showAgreementPreview, setShowAgreementPreview] = useState(false);
	const [showLegalHistory, setShowLegalHistory] = useState(false);
	const { project } = useCurrentProject();
	const usesCoDevelopmentAgreement = Boolean(
		project?.usesCoDevelopmentAgreement ?? project?.agree,
	);

	const appendixInput = useMemo<ProjectLegalSnapshotInput | undefined>(() => {
		if (!contextProject?.id && !project?.id) {
			return undefined;
		}

		return {
			projectName: contextProject?.name || project?.name || "Project",
			projectId: contextProject?.id || project?.id,
			projectSlug: project?.slug,
			agreementDate: project?.createdAt,
			platformShare: undefined,
			mentorFundShare: undefined,
			damageCompensationEnabled: project?.damageCompensationEnabled ?? true,
			damageCompensationAmount:
				project?.damageCompensationAmount ?? DEFAULT_DAMAGE_COMPENSATION_AMOUNT,
			damageCompensationCurrency:
				project?.damageCompensationCurrency ??
				DEFAULT_DAMAGE_COMPENSATION_CURRENCY,
		};
	}, [contextProject?.id, contextProject?.name, project]);

	const {
		data: projectDocuments,
		refetch: fetchMyProjectDocuments,
		isLoading: isLoadingMyProjectDocuments,
	} = useQuery({
		queryKey: ["project-team-documents", contextProject?.teamId],
		queryFn: () =>
			axios.get<TeamDocumentWithCreatedByUser[]>(
				"/api/user/project/documents",
				{
					params: { teamId: contextProject?.teamId },
				},
			),
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

	const { data: legalHistory, isLoading: isLegalHistoryLoading } = useQuery({
		queryKey: ["project-legal-history", contextProject?.id],
		queryFn: () =>
			axios.get<ProjectLegalHistoryResponse>(
				"/api/user/project/legal-history",
				{
					params: { projectId: contextProject?.id },
				},
			),
		enabled: !!contextProject?.id && usesCoDevelopmentAgreement,
		refetchOnWindowFocus: false,
	});

	const { mutateAsync: deleteDocument } = useMutation({
		mutationFn: ({ id, teamId }: { id: string; teamId: string }) =>
			axios.delete(`/api/user/project/documents/${id}`, {
				params: { teamId },
			}),
	});

	const effectiveAppendixInput = useMemo<
		ProjectLegalSnapshotInput | undefined
	>(() => {
		if (!appendixInput) {
			return undefined;
		}

		return {
			...appendixInput,
			platformShare:
				projectEquity?.data?.platformShare ?? PLATFORM_SHARE_PERCENT,
			mentorFundShare:
				projectEquity?.data?.mentorFundShare ?? DEFAULT_MENTOR_FUND_SHARE,
		};
	}, [appendixInput, projectEquity?.data]);

	const legalDocumentDates = useMemo(() => {
		const snapshots = legalHistory?.data?.snapshots ?? [];
		const createdAt = snapshots[0]?.createdAt || project?.createdAt;
		const updatedAt =
			snapshots[snapshots.length - 1]?.createdAt ||
			snapshots[snapshots.length - 1]?.supersededAt ||
			project?.createdAt ||
			null;

		return {
			createdAt,
			updatedAt,
		};
	}, [legalHistory?.data?.snapshots, project?.createdAt]);

	const rows = useMemo<ProjectDocumentRow[]>(() => {
		const documentRows =
			projectDocuments?.data?.map((document) => ({
				key: document.id,
				kind: "external" as const,
				id: document.id,
				type: document.type,
				name: document.name || getDocumentTypeLabel(document.type),
				description: document.description,
				link: document.link,
				createdBy: {
					name: document.createdByUser?.name || "Unknown user",
					image: document.createdByUser?.image || null,
				},
				createdAt: document.createdAt,
				updatedAt: document.updatedAt,
			})) || [];

		if (!usesCoDevelopmentAgreement) {
			return documentRows;
		}

		return [
			{
				key: "co-development-agreement",
				kind: "legal" as const,
				name: "Co-development agreement",
				description:
					"Platform agreement with current project-specific parameters and appendix.",
				createdBy: {
					name: "Platform",
					image: null,
				},
				createdAt: legalDocumentDates.createdAt,
				updatedAt: legalDocumentDates.updatedAt,
			},
			...documentRows,
		];
	}, [
		legalDocumentDates.createdAt,
		legalDocumentDates.updatedAt,
		projectDocuments?.data,
		usesCoDevelopmentAgreement,
	]);

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

	const handleOpenDocument = (record: ProjectDocumentRow) => {
		if (record.kind === "legal") {
			setShowAgreementPreview(true);
			return;
		}

		window.open(record.link, "_blank", "noopener,noreferrer");
	};

	const handleDownloadAgreement = async () => {
		if (!effectiveAppendixInput) {
			return;
		}

		const template = await axios.get<{ markdown: string }>(
			"/api/legal/co-development-agreement",
		);
		const snapshotMarkdown = buildProjectLegalSnapshotMarkdown(
			template.data.markdown,
			effectiveAppendixInput,
		);
		const blob = new Blob([snapshotMarkdown], {
			type: "text/markdown;charset=utf-8",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = effectiveAppendixInput.projectSlug
			? `${effectiveAppendixInput.projectSlug}-co-development-agreement.md`
			: "co-development-agreement.md";
		link.click();
		URL.revokeObjectURL(url);
	};

	const buildMenuItems = (record: ProjectDocumentRow): MenuProps["items"] => {
		if (record.kind === "legal") {
			return [
				{
					key: "open",
					label: t("Open", "Open"),
					icon: <EyeOutlined />,
				},
				{
					key: "download",
					label: t("Download", "Download"),
					icon: <DownloadOutlined />,
				},
				{
					key: "history",
					label: t("History", "History"),
					icon: <HistoryOutlined />,
				},
			];
		}

		return [
			{
				key: "open",
				label: t("Open", "Open"),
				icon: <LinkOutlined />,
			},
			{
				key: "delete",
				label: t("Delete", "Delete"),
				danger: true,
			},
		];
	};

	const handleMenuAction = async (record: ProjectDocumentRow, key: string) => {
		if (key === "open") {
			handleOpenDocument(record);
			return;
		}

		if (record.kind === "legal" && key === "download") {
			await handleDownloadAgreement();
			return;
		}

		if (record.kind === "legal" && key === "history") {
			setShowLegalHistory(true);
			return;
		}

		if (record.kind === "external" && key === "delete") {
			await handleDeleteDocument({
				id: record.id,
				teamId: contextProject?.teamId,
			});
		}
	};

	const documentsColumns: ColumnsType<ProjectDocumentRow> = [
		{
			title: t("project.documents.title", "Title"),
			dataIndex: "name",
			key: "name",
			width: "28%",
			ellipsis: true,
			render: (_value, record) => (
				<Space direction="vertical" size={0}>
					<Text strong>{record.name}</Text>
					{record.kind === "external" ? (
						<LinkPreviewText link={record.link} />
					) : (
						<Text type="secondary">
							{t("Generated by platform", "Generated by platform")}
						</Text>
					)}
				</Space>
			),
		},
		{
			title: t("project.documents.description", "Description"),
			dataIndex: "description",
			key: "description",
			width: "28%",
			render: (value) => (
				<Text type="secondary" style={{ maxWidth: 280 }}>
					{value || "—"}
				</Text>
			),
		},
		{
			title: t("project.documents.addedBy", "Added by"),
			dataIndex: "createdBy",
			key: "createdBy",
			width: "16%",
			render: (value: ProjectDocumentRow["createdBy"]) => (
				<Space align="center" size={8}>
					<Avatar src={value.image} size={24}>
						{value.name?.slice(0, 1)}
					</Avatar>
					<Text>{value.name}</Text>
				</Space>
			),
		},
		{
			title: t("project.documents.createdAt", "Created at"),
			dataIndex: "createdAt",
			key: "createdAt",
			width: "14%",
			render: (value) => <Text>{formatDocumentDate(value)}</Text>,
		},
		{
			title: t("project.documents.updatedAt", "Last changed"),
			dataIndex: "updatedAt",
			key: "updatedAt",
			width: "14%",
			render: (value) => <Text>{formatDocumentDate(value)}</Text>,
		},
		{
			key: "actions",
			width: "1%",
			align: "right",
			render: (_value, record) => {
				const items = buildMenuItems(record);

				return (
					<Dropdown
						trigger={["click"]}
						menu={{
							items,
							onClick: async ({ key, domEvent }) => {
								domEvent.preventDefault();
								domEvent.stopPropagation();
								await handleMenuAction(record, key);
							},
						}}
					>
						<Button
							type="text"
							icon={<EllipsisOutlined />}
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
							}}
						/>
					</Dropdown>
				);
			},
		},
	];

	return (
		<>
			<Flex justify="space-between" align="center">
				<Space align="center">
					<Button onClick={() => setShowDocumentModal(true)}>
						{t("project.documents.addDocument", "Add document")}
					</Button>
				</Space>
			</Flex>

			{rows.length > 0 ? (
				<ModernTable
					loading={isLoadingMyProjectDocuments}
					columns={documentsColumns}
					dataSource={rows}
					pagination={false}
					onRow={(record) => ({
						onClick: () => handleOpenDocument(record),
						style: { cursor: "pointer" },
					})}
				/>
			) : (
				<p style={{ marginTop: 12, color: "gray" }}>
					{t(
						"project.documents.noDocuments",
						"There are no documents at the moment",
					)}
				</p>
			)}

			<ProjectLegalPreviewModal
				open={showAgreementPreview}
				onClose={() => setShowAgreementPreview(false)}
				title={t(
					"project.documents.coDevelopmentAgreement",
					"Co-development agreement",
				)}
				appendixInput={effectiveAppendixInput}
				showProjectAppendix
			/>

			<ProjectLegalHistoryModal
				open={showLegalHistory}
				onClose={() => setShowLegalHistory(false)}
				activeLegalSnapshotId={legalHistory?.data?.activeLegalSnapshotId}
				snapshots={legalHistory?.data?.snapshots || []}
				events={legalHistory?.data?.events || []}
				loading={isLegalHistoryLoading}
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
