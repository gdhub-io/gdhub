"use client";

import { Avatar, Popover, Row, Space, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import ModernTable from "@/components/ModernTable";
import type { LegalAcceptance } from "@/types/agreements";
import { LegalAcceptanceContext, LegalActorRole } from "@/types/agreements";

const { Title, Text } = Typography;

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

interface AcceptancesScreenProps {
	acceptances: LegalAcceptance[];
}

export const AcceptancesScreen = ({ acceptances }: AcceptancesScreenProps) => {
	const columns: ColumnsType<LegalAcceptance> = [
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
							<div>
								<Text strong>{name}</Text>
							</div>
							<Text type="secondary" style={{ fontSize: 12 }}>
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
			width: 110,
			render: (role: LegalActorRole) => (
				<Tag color={roleColor[role]}>{role}</Tag>
			),
		},
		{
			title: "Context",
			dataIndex: "context",
			key: "context",
			width: 180,
			render: (context: LegalAcceptanceContext) => (
				<Text type="secondary">{contextLabel[context]}</Text>
			),
		},
		{
			title: "Snapshot",
			dataIndex: "snapshotId",
			key: "snapshotId",
			width: 130,
			render: (id: string) => (
				<Text
					type="secondary"
					style={{ fontFamily: "monospace", fontSize: 11 }}
				>
					{id}
				</Text>
			),
		},
		{
			title: "Accepted at",
			dataIndex: "acceptedAt",
			key: "acceptedAt",
			width: 140,
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

	return (
		<div>
			<Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
				<Title level={3}>Acceptances</Title>
			</Row>
			<ModernTable
				dataSource={acceptances}
				columns={columns}
				rowKey="id"
				pagination={{ pageSize: 20, size: "small" }}
			/>
		</div>
	);
};
