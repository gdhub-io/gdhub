"use client";

import {
	IconArrowLeft,
	IconBell,
	IconCheck,
	IconClock,
	IconLink,
} from "@tabler/icons-react";
import {
	Alert,
	Avatar,
	Button,
	Col,
	Divider,
	Form,
	Input,
	message,
	Row,
	Select,
	Space,
	Statistic,
	Tag,
	Timeline,
	Tooltip,
	Typography,
} from "antd";
import { useMemo } from "react";
import type {
	LegalAcceptance,
	LegalUser,
	ProjectLegalSnapshot,
} from "@/types/agreements";
import { ProjectLegalSnapshotStatus } from "@/types/agreements";

const { Text, Title } = Typography;

const getUserInitials = (name: string) =>
	name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();

const formatDate = (date: string) =>
	new Date(date).toLocaleString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

interface SignersScreenProps {
	snapshot: ProjectLegalSnapshot;
	projectMembers: LegalUser[];
	canManage: boolean;
	onBack: () => void;
}

export const SignersScreen = ({
	snapshot,
	projectMembers,
	canManage,
	onBack,
}: SignersScreenProps) => {
	const acceptedUserIds = new Set(
		(snapshot.acceptances ?? []).map((a) => a.userId),
	);

	const accepted = (snapshot.acceptances ?? []).filter((a) => a);
	const pending = projectMembers.filter((m) => !acceptedUserIds.has(m.id));

	const auditItems = useMemo(
		() =>
			(snapshot.acceptances ?? [])
				.slice()
				.sort(
					(a, b) =>
						new Date(a.acceptedAt).getTime() - new Date(b.acceptedAt).getTime(),
				)
				.map((acc) => ({
					dot: <IconCheck size={12} color="#52c41a" />,
					children: (
						<Text style={{ fontSize: 12 }}>
							<Text strong>{acc.user?.name ?? acc.userId}</Text> accepted ·{" "}
							{formatDate(acc.acceptedAt)}
							{acc.ipAddress && (
								<Text type="secondary"> · {acc.ipAddress}</Text>
							)}
						</Text>
					),
				})),
		[snapshot.acceptances],
	);

	const copyLink = () => {
		const link = `${window.location.origin}/agreement/${snapshot.id}`;
		void navigator.clipboard.writeText(link);
		void message.success("Link copied to clipboard");
	};

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
					Back
				</Button>
				<div>
					<Text strong style={{ fontSize: 16 }}>
						{snapshot.title}
					</Text>
					<Tag
						color={
							snapshot.status === ProjectLegalSnapshotStatus.Active
								? "green"
								: "default"
						}
						style={{ marginLeft: 8 }}
					>
						{snapshot.status}
					</Tag>
				</div>
			</div>

			<Space size="large" style={{ marginBottom: 24 }}>
				<Statistic title="Members" value={projectMembers.length} />
				<Statistic
					title="Accepted"
					value={accepted.length}
					valueStyle={{ color: "#3f8600" }}
				/>
				<Statistic
					title="Pending"
					value={pending.length}
					valueStyle={pending.length > 0 ? { color: "#d46b08" } : undefined}
				/>
			</Space>

			<Row gutter={24}>
				<Col span={14}>
					<Title level={5} style={{ marginBottom: 12 }}>
						Signers
					</Title>

					<div style={{ marginBottom: 8 }}>
						{accepted.map((acc) => (
							<div
								key={acc.id}
								style={{
									display: "flex",
									alignItems: "center",
									gap: 10,
									padding: "8px 0",
									borderBottom: "0.5px solid var(--ant-color-border-secondary)",
								}}
							>
								<Avatar
									size="small"
									style={{
										background: "var(--ant-color-success-bg)",
										color: "var(--ant-color-success)",
									}}
								>
									{getUserInitials(acc.user?.name ?? acc.userId)}
								</Avatar>
								<Text style={{ flex: 1 }}>{acc.user?.name ?? acc.userId}</Text>
								<Tag color="green" icon={<IconCheck size={10} />}>
									Accepted
								</Tag>
								<Text
									type="secondary"
									style={{ fontSize: 11, width: 140, textAlign: "right" }}
								>
									{formatDate(acc.acceptedAt)}
								</Text>
							</div>
						))}

						{pending.map((user) => (
							<div
								key={user.id}
								style={{
									display: "flex",
									alignItems: "center",
									gap: 10,
									padding: "8px 0",
									borderBottom: "0.5px solid var(--ant-color-border-secondary)",
								}}
							>
								<Avatar
									size="small"
									style={{
										background: "var(--ant-color-warning-bg)",
										color: "var(--ant-color-warning)",
									}}
								>
									{getUserInitials(user.name)}
								</Avatar>
								<Text style={{ flex: 1 }}>{user.name}</Text>
								<Tag color="orange" icon={<IconClock size={10} />}>
									Pending
								</Tag>
								{canManage && (
									<Tooltip title="Copy sign link">
										<Button
											type="text"
											size="small"
											icon={<IconLink size={12} />}
											onClick={copyLink}
										/>
									</Tooltip>
								)}
							</div>
						))}
					</div>

					{canManage && pending.length > 0 && (
						<Alert
							type="info"
							showIcon
							style={{ marginTop: 12 }}
							message={`${pending.length} members haven't signed yet`}
							action={
								<Button
									size="small"
									icon={<IconBell size={12} />}
									onClick={() => void message.success("Reminder sent")}
								>
									Send reminder
								</Button>
							}
						/>
					)}
				</Col>

				<Col span={10}>
					<Title level={5} style={{ marginBottom: 12 }}>
						Notification settings
					</Title>
					{canManage ? (
						<Form layout="vertical" size="small">
							<Form.Item label="Opt-out period (days)">
								<Input type="number" defaultValue={14} style={{ width: 80 }} />
							</Form.Item>
							<Form.Item label="Channel">
								<Select defaultValue="email+inapp" style={{ width: "100%" }}>
									<Select.Option value="email+inapp">
										Email + In-app
									</Select.Option>
									<Select.Option value="email">Email only</Select.Option>
									<Select.Option value="inapp">In-app only</Select.Option>
								</Select>
							</Form.Item>
							<Form.Item label="Email subject">
								<Input defaultValue={`Changes to ${snapshot.title}`} />
							</Form.Item>
							<Button
								type="primary"
								size="small"
								icon={<IconBell size={12} />}
								onClick={() => void message.success("Notifications sent")}
							>
								Send to all members
							</Button>
						</Form>
					) : (
						<Alert
							type="info"
							showIcon
							message="Only project authors can manage notifications."
						/>
					)}

					<Divider />

					<Title level={5} style={{ marginBottom: 12 }}>
						Audit log
					</Title>
					{auditItems.length > 0 ? (
						<Timeline items={auditItems} />
					) : (
						<Text type="secondary">No acceptances yet.</Text>
					)}
				</Col>
			</Row>
		</div>
	);
};
