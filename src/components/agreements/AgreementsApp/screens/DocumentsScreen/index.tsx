"use client";

import { IconEye, IconPlus } from "@tabler/icons-react";
import { Button, Popover, Row, Space, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import ModernTable from "@/components/ModernTable";
import type { ProjectLegalSnapshot } from "@/types/agreements";
import {
	LegalDocumentContext,
	ProjectLegalSnapshotStatus,
} from "@/types/agreements";

const { Title, Text } = Typography;

const statusColor: Record<ProjectLegalSnapshotStatus, string> = {
	[ProjectLegalSnapshotStatus.Active]: "green",
	[ProjectLegalSnapshotStatus.Superseded]: "default",
	[ProjectLegalSnapshotStatus.Void]: "red",
};

const contextColor: Record<LegalDocumentContext, string> = {
	[LegalDocumentContext.Platform]: "blue",
	[LegalDocumentContext.Project]: "purple",
	[LegalDocumentContext.Person]: "orange",
};

const renderSubject = (snapshot: ProjectLegalSnapshot): React.ReactNode => {
	const ctx = snapshot.template?.context;
	const project = snapshot.params?.project_name ?? snapshot.projectId;
	const participant = snapshot.params?.participant_name;

	if (ctx === LegalDocumentContext.Platform) {
		return <Text type="secondary">All platform users</Text>;
	}
	if (ctx === LegalDocumentContext.Person && participant) {
		return (
			<div>
				<Text style={{ fontSize: 12 }}>
					{snapshot.params?.author_name} ↔ {participant}
				</Text>
				<Text type="secondary" style={{ fontSize: 11, display: "block" }}>
					{project}
				</Text>
			</div>
		);
	}
	return <Text style={{ fontSize: 12 }}>{project}</Text>;
};

interface DocumentsScreenProps {
	snapshots: ProjectLegalSnapshot[];
	onView: (snapshot: ProjectLegalSnapshot) => void;
	onCreate: () => void;
}

export const DocumentsScreen = ({
	snapshots,
	onView,
	onCreate,
}: DocumentsScreenProps) => {
	const columns: ColumnsType<ProjectLegalSnapshot> = [
		{
			title: "Document",
			key: "title",
			render: (_, record) => (
				<div>
					<Button
						type="link"
						style={{ padding: 0, height: "auto", fontWeight: 600 }}
						onClick={() => onView(record)}
					>
						{record.title}
					</Button>
					<Text type="secondary" style={{ fontSize: 12, display: "block" }}>
						Template v{record.templateVersion}
					</Text>
				</div>
			),
		},
		{
			title: "Context",
			key: "context",
			width: 100,
			render: (_, record) =>
				record.template?.context ? (
					<Tag color={contextColor[record.template.context]}>
						{record.template.context}
					</Tag>
				) : null,
		},
		{
			title: "Subject",
			key: "subject",
			width: 220,
			render: (_, record) => renderSubject(record),
		},
		{
			title: "Status",
			dataIndex: "status",
			key: "status",
			width: 110,
			render: (status: ProjectLegalSnapshotStatus) => (
				<Tag color={statusColor[status]}>{status}</Tag>
			),
		},
		{
			title: "Signatures",
			key: "acceptances",
			width: 100,
			render: (_, record) => (
				<Text type="secondary">{record.acceptances?.length ?? 0}</Text>
			),
		},
		{
			title: "Created",
			dataIndex: "createdAt",
			key: "createdAt",
			width: 130,
			render: (date: string) => (
				<Popover content={dayjs(date).format("LLL")}>
					<Text>{dayjs(date).fromNow()}</Text>
				</Popover>
			),
		},
		{
			key: "actions",
			width: "1%",
			render: (_, record) => (
				<Space size="large">
					<Button
						type="text"
						icon={<IconEye size={14} />}
						onClick={() => onView(record)}
					/>
				</Space>
			),
		},
	];

	return (
		<div>
			<Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
				<Title level={3}>Documents</Title>
				<Button type="primary" icon={<IconPlus size={14} />} onClick={onCreate}>
					New document
				</Button>
			</Row>
			<ModernTable
				dataSource={snapshots}
				columns={columns}
				rowKey="id"
				pagination={{ pageSize: 20, size: "small" }}
			/>
		</div>
	);
};
