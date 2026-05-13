"use client";

import {
	IconFileText,
	IconHistory,
	IconPlus,
	IconUsers,
} from "@tabler/icons-react";
import {
	Badge,
	Button,
	Empty,
	Space,
	Statistic,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type React from "react";
import type { ProjectLegalSnapshot } from "@/types/agreements";
import {
	LegalDocumentContext,
	ProjectLegalSnapshotStatus,
} from "@/types/agreements";

const { Text } = Typography;

const statusColor: Record<ProjectLegalSnapshotStatus, string> = {
	[ProjectLegalSnapshotStatus.Active]: "green",
	[ProjectLegalSnapshotStatus.Superseded]: "default",
	[ProjectLegalSnapshotStatus.Void]: "red",
};

interface DocumentsScreenProps {
	snapshots: ProjectLegalSnapshot[];
	projectName: string;
	canCreate: boolean;
	onView: (snapshot: ProjectLegalSnapshot) => void;
	onSigners: (snapshot: ProjectLegalSnapshot) => void;
	onCreate: () => void;
}

const renderSubject = (
	snapshot: ProjectLegalSnapshot,
	projectName: string,
): React.ReactNode => {
	const ctx = snapshot.template?.context;
	if (ctx === LegalDocumentContext.Person) {
		const participant = snapshot.params?.participant_name;
		return (
			<div>
				<Text style={{ fontSize: 12 }}>{participant ?? "—"}</Text>
				<Text type="secondary" style={{ fontSize: 11, display: "block" }}>
					{projectName}
				</Text>
			</div>
		);
	}
	if (ctx === LegalDocumentContext.Project) {
		return <Text style={{ fontSize: 12 }}>{projectName}</Text>;
	}
	return (
		<Text type="secondary" style={{ fontSize: 12 }}>
			—
		</Text>
	);
};

export const DocumentsScreen = ({
	snapshots,
	projectName,
	canCreate,
	onView,
	onSigners,
	onCreate,
}: DocumentsScreenProps) => {
	const active = snapshots.filter(
		(s) => s.status === ProjectLegalSnapshotStatus.Active,
	).length;
	const pending = snapshots.reduce(
		(acc, s) => acc + (s.acceptances?.length ?? 0),
		0,
	);

	const columns: ColumnsType<ProjectLegalSnapshot> = [
		{
			title: "Document",
			key: "title",
			render: (_, record) => (
				<Space>
					<IconFileText
						size={16}
						style={{ color: "var(--ant-color-text-secondary)" }}
					/>
					<div>
						<Button
							type="link"
							style={{ padding: 0, height: "auto", fontWeight: 600 }}
							onClick={() => onView(record)}
						>
							{record.title}
						</Button>
						<Text type="secondary" style={{ fontSize: 12 }}>
							Template v{record.templateVersion} · {record.template?.context}
						</Text>
					</div>
				</Space>
			),
		},
		{
			title: "Subject",
			key: "subject",
			width: 180,
			render: (_, record) => renderSubject(record, projectName),
		},
		{
			title: "Status",
			dataIndex: "status",
			key: "status",
			width: 130,
			render: (status: ProjectLegalSnapshotStatus) => (
				<Tag color={statusColor[status]}>{status}</Tag>
			),
		},
		{
			title: "Signatures",
			key: "acceptances",
			width: 120,
			render: (_, record) => (
				<Badge count={record.acceptances?.length ?? 0} color="blue" showZero />
			),
		},
		{
			title: "Created",
			dataIndex: "createdAt",
			key: "createdAt",
			width: 160,
			render: (date: string) =>
				new Date(date).toLocaleDateString("en-GB", {
					day: "2-digit",
					month: "short",
					year: "numeric",
				}),
		},
		{
			title: "",
			key: "actions",
			width: 80,
			render: (_, record) => (
				<Space size={4}>
					<Tooltip title="View signers">
						<Button
							type="text"
							size="small"
							icon={<IconUsers size={14} />}
							onClick={() => onSigners(record)}
						/>
					</Tooltip>
					<Tooltip title="History">
						<Button
							type="text"
							size="small"
							icon={<IconHistory size={14} />}
							disabled
						/>
					</Tooltip>
				</Space>
			),
		},
	];

	return (
		<div>
			<Space size="large" style={{ marginBottom: 24 }}>
				<Statistic title="Documents" value={snapshots.length} />
				<Statistic
					title="Active"
					value={active}
					valueStyle={{ color: "#3f8600" }}
				/>
				<Statistic title="Signatures collected" value={pending} />
			</Space>

			{canCreate && (
				<div
					style={{
						display: "flex",
						justifyContent: "flex-end",
						marginBottom: 16,
					}}
				>
					<Button
						type="primary"
						icon={<IconPlus size={14} />}
						onClick={onCreate}
					>
						New document
					</Button>
				</div>
			)}

			{snapshots.length === 0 ? (
				<Empty
					description="No documents yet"
					image={Empty.PRESENTED_IMAGE_SIMPLE}
				>
					{canCreate && (
						<Button type="primary" onClick={onCreate}>
							Create first document
						</Button>
					)}
				</Empty>
			) : (
				<Table
					dataSource={snapshots}
					columns={columns}
					rowKey="id"
					size="small"
					pagination={false}
				/>
			)}
		</div>
	);
};
