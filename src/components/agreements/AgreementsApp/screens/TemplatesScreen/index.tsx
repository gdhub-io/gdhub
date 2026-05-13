"use client";

import { IconFilePlus, IconPencil, IconPlus } from "@tabler/icons-react";
import { Button, Popover, Row, Space, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import ModernTable from "@/components/ModernTable";
import type { LegalDocumentTemplate } from "@/types/agreements";
import { LegalDocumentContext } from "@/types/agreements";

const { Title, Text } = Typography;

const contextColor: Record<LegalDocumentContext, string> = {
	[LegalDocumentContext.Platform]: "blue",
	[LegalDocumentContext.Project]: "purple",
	[LegalDocumentContext.Person]: "orange",
};

const contextSubject: Record<LegalDocumentContext, string> = {
	[LegalDocumentContext.Platform]: "All platform users",
	[LegalDocumentContext.Project]: "Project team",
	[LegalDocumentContext.Person]: "Author ↔ Participant",
};

interface TemplatesScreenProps {
	templates: LegalDocumentTemplate[];
	onEdit: (template: LegalDocumentTemplate) => void;
	onCreate: () => void;
	onCreateDocument: (template: LegalDocumentTemplate) => void;
}

export const TemplatesScreen = ({
	templates,
	onEdit,
	onCreate,
	onCreateDocument,
}: TemplatesScreenProps) => {
	const columns: ColumnsType<LegalDocumentTemplate> = [
		{
			title: "Title",
			key: "title",
			render: (_, record) => (
				<div>
					<div>
						<Text strong>{record.title}</Text>
						<Tag style={{ marginLeft: 8 }}>v{record.version}</Tag>
					</div>
					<Text type="secondary" style={{ fontSize: 12 }}>
						{(record.variables ?? []).length} variables
					</Text>
				</div>
			),
		},
		{
			title: "Context",
			key: "context",
			width: 110,
			render: (_, record) => (
				<Tag color={contextColor[record.context]}>{record.context}</Tag>
			),
		},
		{
			title: "Subject",
			key: "subject",
			width: 200,
			render: (_, record) => (
				<Text type="secondary" style={{ fontSize: 12 }}>
					{contextSubject[record.context]}
				</Text>
			),
		},
		{
			title: "Used in",
			dataIndex: "snapshotCount",
			key: "snapshotCount",
			width: 90,
			render: (count: number) => <Text type="secondary">{count ?? 0}</Text>,
		},
		{
			title: "Updated",
			dataIndex: "updatedAt",
			key: "updatedAt",
			width: 140,
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
				<Space size={4}>
					<Tooltip title="Create document">
						<Button
							type="text"
							icon={<IconFilePlus size={14} />}
							onClick={() => onCreateDocument(record)}
						/>
					</Tooltip>
					<Tooltip title="Edit template">
						<Button
							type="text"
							icon={<IconPencil size={14} />}
							onClick={() => onEdit(record)}
						/>
					</Tooltip>
				</Space>
			),
		},
	];

	return (
		<div>
			<Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
				<Title level={3}>Templates</Title>
				<Button type="primary" icon={<IconPlus size={14} />} onClick={onCreate}>
					New template
				</Button>
			</Row>
			<ModernTable
				dataSource={templates}
				columns={columns}
				rowKey="id"
				pagination={false}
			/>
		</div>
	);
};
