"use client";

import { IconArrowLeft, IconCheck, IconClock } from "@tabler/icons-react";
import {
	Avatar,
	Button,
	Popover,
	Space,
	Tabs,
	Tag,
	Timeline,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { DocumentRenderer } from "@/components/agreements/DocumentRenderer";
import ModernTable from "@/components/ModernTable";
import type { LegalAcceptance, ProjectLegalSnapshot } from "@/types/agreements";
import {
	LegalAcceptanceContext,
	LegalActorRole,
	ProjectLegalSnapshotStatus,
} from "@/types/agreements";

const { Title, Text } = Typography;

const statusColor: Record<ProjectLegalSnapshotStatus, string> = {
	[ProjectLegalSnapshotStatus.Active]: "green",
	[ProjectLegalSnapshotStatus.Superseded]: "default",
	[ProjectLegalSnapshotStatus.Void]: "red",
};

const contextLabel: Record<LegalAcceptanceContext, string> = {
	[LegalAcceptanceContext.PlatformRegistration]: "Platform Registration",
	[LegalAcceptanceContext.ProjectCreate]: "Project Create",
	[LegalAcceptanceContext.InviteJoin]: "Invite Join",
	[LegalAcceptanceContext.VacancyHire]: "Vacancy Hire",
	[LegalAcceptanceContext.MentorJoin]: "Mentor Join",
	[LegalAcceptanceContext.ShareChange]: "Share Change",
	[LegalAcceptanceContext.MemberExclusion]: "Member Exclusion",
};

const roleColor: Record<LegalActorRole, string> = {
	[LegalActorRole.Author]: "blue",
	[LegalActorRole.Member]: "green",
	[LegalActorRole.Mentor]: "purple",
	[LegalActorRole.Platform]: "default",
};

interface DocumentDetailScreenProps {
	/** The currently viewed snapshot (the version the user clicked on) */
	snapshot: ProjectLegalSnapshot;
	/** All versions of the same logical document (same templateId + projectId) */
	versions: ProjectLegalSnapshot[];
	/** All acceptances across all versions of this document */
	acceptances: LegalAcceptance[];
	onBack: () => void;
	onViewVersion: (snapshot: ProjectLegalSnapshot) => void;
}

export const DocumentDetailScreen = ({
	snapshot,
	versions,
	acceptances,
	onBack,
	onViewVersion,
}: DocumentDetailScreenProps) => {
	const acceptanceColumns: ColumnsType<LegalAcceptance> = [
		{
			title: "User",
			key: "user",
			render: (_, record) => {
				const name = record.user?.name ?? record.userId;
				const initials = name
					.split(" ")
					.map((n) => n[0])
					.join("")
					.slice(0, 2)
					.toUpperCase();
				return (
					<Space>
						<Avatar size="small">{initials}</Avatar>
						<div>
							<Text strong style={{ fontSize: 13 }}>
								{name}
							</Text>
							<Text type="secondary" style={{ fontSize: 11, display: "block" }}>
								{record.user?.email}
							</Text>
						</div>
					</Space>
				);
			},
		},
		{
			title: "Role",
			dataIndex: "actorRole",
			key: "actorRole",
			width: 100,
			render: (role: LegalActorRole) => (
				<Tag color={roleColor[role]}>{role}</Tag>
			),
		},
		{
			title: "Context",
			dataIndex: "context",
			key: "context",
			width: 180,
			render: (ctx: LegalAcceptanceContext) => (
				<Text type="secondary">{contextLabel[ctx]}</Text>
			),
		},
		{
			title: "Document version",
			key: "snapshotVersion",
			width: 150,
			render: (_, record) => {
				const ver = versions.find((v) => v.id === record.snapshotId);
				return (
					<Text type="secondary" style={{ fontSize: 12 }}>
						Template v{ver?.templateVersion ?? "—"}
						{ver?.status === ProjectLegalSnapshotStatus.Superseded && (
							<Tag style={{ marginLeft: 4 }}>outdated</Tag>
						)}
					</Text>
				);
			},
		},
		{
			title: "Accepted at",
			dataIndex: "acceptedAt",
			key: "acceptedAt",
			width: 130,
			render: (date: string) => (
				<Popover content={dayjs(date).format("LLL")}>
					<Text>{dayjs(date).fromNow()}</Text>
				</Popover>
			),
		},
		{
			title: "IP",
			dataIndex: "ipAddress",
			key: "ipAddress",
			width: 120,
			render: (ip?: string) => (
				<Text type="secondary" style={{ fontSize: 12 }}>
					{ip ?? "—"}
				</Text>
			),
		},
	];

	const versionItems = versions.map((v, i) => ({
		dot:
			v.status === ProjectLegalSnapshotStatus.Active ? (
				<IconCheck size={12} color="#52c41a" />
			) : (
				<IconClock size={12} color="#8c8c8c" />
			),
		children: (
			<div>
				<Space>
					<Button
						type={v.id === snapshot.id ? "default" : "link"}
						size="small"
						style={{
							padding: 0,
							height: "auto",
							fontWeight: v.id === snapshot.id ? 600 : 400,
						}}
						onClick={() => onViewVersion(v)}
					>
						Template v{v.templateVersion}
						{i === 0 && v.status === ProjectLegalSnapshotStatus.Active && (
							<Tag color="green" style={{ marginLeft: 6 }}>
								Current
							</Tag>
						)}
					</Button>
				</Space>
				<Text type="secondary" style={{ fontSize: 11, display: "block" }}>
					{dayjs(v.createdAt).format("D MMM YYYY")}
					{v.supersededAt &&
						` → superseded ${dayjs(v.supersededAt).format("D MMM YYYY")}`}
					{" · "}
					{v.acceptances?.length ?? 0} signatures
				</Text>
				{v.params && (
					<div
						style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}
					>
						{Object.entries(v.params).map(([k, val]) => (
							<Tag key={k} style={{ fontSize: 11 }}>
								{k}: {val}
							</Tag>
						))}
					</div>
				)}
			</div>
		),
	}));

	const tabItems = [
		{
			key: "content",
			label: "Content",
			children: (
				<DocumentRenderer
					snapshot={snapshot}
					showHeader={false}
					style={{ marginTop: 8 }}
				/>
			),
		},
		{
			key: "versions",
			label: `Version history (${versions.length})`,
			children: (
				<div style={{ marginTop: 16 }}>
					<Timeline items={versionItems} />
				</div>
			),
		},
		{
			key: "signatures",
			label: `Signatures (${acceptances.length})`,
			children: (
				<div style={{ marginTop: 8 }}>
					<ModernTable
						dataSource={acceptances}
						columns={acceptanceColumns}
						rowKey="id"
						pagination={{ pageSize: 20, size: "small" }}
					/>
				</div>
			),
		},
	];

	return (
		<div>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 12,
					marginBottom: 20,
				}}
			>
				<Button type="text" icon={<IconArrowLeft size={16} />} onClick={onBack}>
					All documents
				</Button>
				<Title level={3} style={{ margin: 0 }}>
					{snapshot.title}
				</Title>
				<Tag color={statusColor[snapshot.status]}>{snapshot.status}</Tag>
				{snapshot.template?.context && <Tag>{snapshot.template.context}</Tag>}
			</div>

			<Tabs items={tabItems} />
		</div>
	);
};
