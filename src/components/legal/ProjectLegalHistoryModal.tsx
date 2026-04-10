import { FileTextOutlined } from "@ant-design/icons";
import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useTranslate } from "@tolgee/react";
import { Avatar, Empty, Modal, Space, Timeline, Typography } from "antd";
import dayjs from "dayjs";
import { useMemo } from "react";

const { Paragraph, Text } = Typography;

type HistoryUser = {
	id: string;
	name: string | null;
	image: string | null;
};

type HistorySnapshot = {
	id: string;
	title: string;
	templateVersion: number;
	status: prismaClient.ProjectLegalSnapshotStatus;
	params: unknown;
	createdAt: string | Date;
	supersededAt: string | Date | null;
	createdBy: HistoryUser;
};

type HistoryEvent = {
	id: string;
	type: prismaClient.ProjectLegalEventType;
	payload: unknown;
	effectiveAt: string | Date | null;
	createdAt: string | Date;
	snapshotId: string | null;
	actorUser: HistoryUser | null;
	subjectUser: HistoryUser | null;
	subjectTeamMember: {
		id: string;
		status: prismaClient.TeamMemberStatus;
		user: HistoryUser | null;
	} | null;
};

type ProjectLegalHistoryModalProps = {
	open: boolean;
	onClose: () => void;
	activeLegalSnapshotId?: string | null;
	snapshots: HistorySnapshot[];
	events: HistoryEvent[];
	loading?: boolean;
};

const fieldLabels: Record<string, string> = {
	projectName: "Project name",
	authorName: "Author",
	projectPageUrl: "Project page",
	sharesPageUrl: "Shares page",
	mentorFundShare: "Mentor fund share",
	platformShare: "Platform share",
	damageCompensationEnabled: "Damage compensation clause",
	damageCompensationAmount: "Damage compensation amount",
	damageCompensationCurrency: "Damage compensation currency",
	agreementDate: "Agreement date",
	workflowSteps: "Workflow steps",
	projectPages: "Project pages",
};

const getDisplayName = (user?: HistoryUser | null) =>
	user?.name?.trim() || "Unknown user";

const summarizeSnapshotChanges = (
	current: HistorySnapshot,
	previous?: HistorySnapshot,
) => {
	const currentParams =
		current.params && typeof current.params === "object"
			? (current.params as Record<string, unknown>)
			: {};
	const previousParams =
		previous?.params && typeof previous.params === "object"
			? (previous.params as Record<string, unknown>)
			: {};

	if (!previous) {
		return ["Initial recorded agreement snapshot"];
	}

	const changedFields = Object.keys({
		...previousParams,
		...currentParams,
	}).filter((key) => {
		return (
			JSON.stringify(previousParams[key]) !== JSON.stringify(currentParams[key])
		);
	});

	if (!changedFields.length) {
		return ["Agreement snapshot regenerated"];
	}

	return changedFields.map((key) => {
		const label = fieldLabels[key] || key;
		const previousValue = previousParams[key];
		const currentValue = currentParams[key];

		return `${label}: ${JSON.stringify(previousValue)} -> ${JSON.stringify(currentValue)}`;
	});
};

const ProjectLegalHistoryModal = ({
	open,
	onClose,
	activeLegalSnapshotId,
	snapshots,
	events: _events,
	loading = false,
}: ProjectLegalHistoryModalProps) => {
	const { t } = useTranslate();

	const timelineItems = useMemo(() => {
		const snapshotEntries = snapshots.map((snapshot, index) => {
			const changedFields = summarizeSnapshotChanges(
				snapshot,
				snapshots[index - 1],
			);

			return {
				key: `snapshot-${snapshot.id}`,
				sortDate: dayjs(snapshot.createdAt).valueOf(),
				color:
					snapshot.id === activeLegalSnapshotId ? "green" : ("blue" as const),
				dot: <FileTextOutlined />,
				children: (
					<Space direction="vertical" size={2}>
						<Text strong>
							Agreement snapshot v{snapshot.templateVersion}
							{snapshot.id === activeLegalSnapshotId ? " (current)" : ""}
						</Text>
						<Text type="secondary">
							{dayjs(snapshot.createdAt).format("LLL")}
						</Text>
						<Text type="secondary">
							Created by {getDisplayName(snapshot.createdBy)}
						</Text>
						<Text>{changedFields.join(", ")}</Text>
					</Space>
				),
			};
		});

		return [...snapshotEntries]
			.sort((a, b) => b.sortDate - a.sortDate)
			.map(({ key, color, dot, children }) => ({
				key,
				color,
				dot,
				children,
			}));
	}, [activeLegalSnapshotId, snapshots]);

	return (
		<Modal
			open={open}
			onCancel={onClose}
			footer={null}
			width={760}
			title={t("project.legal.history", "Agreement history")}
			destroyOnHidden
		>
			{timelineItems.length ? (
				<Timeline mode="left" items={timelineItems} pending={loading} />
			) : (
				<Empty
					description={
						<Paragraph type="secondary" style={{ marginBottom: 0 }}>
							{t(
								"project.legal.historyEmpty",
								"No recorded agreement changes yet.",
							)}
						</Paragraph>
					}
				/>
			)}
		</Modal>
	);
};

export default ProjectLegalHistoryModal;
