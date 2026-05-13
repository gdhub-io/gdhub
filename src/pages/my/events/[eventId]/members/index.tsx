import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Avatar,
	Button,
	Input,
	Modal,
	message,
	Space,
	Tag,
	Typography,
} from "antd";
import axios from "axios";
import { useRouter } from "next/router";
import type React from "react";
import { useState } from "react";
import ModernTable from "@/components/ModernTable";
import BatchAssignEventMembersModal from "@/components/modals/BatchAssignEventMembersModal";
import EditEventMemberModal from "@/components/modals/EditEventMemberModal";
import { ProtectedEventLayout } from "@/layouts/ProtectedEventLayout";

const { Text } = Typography;

interface EventMemberUser {
	id: string;
	name?: string | null;
	email?: string | null;
	image?: string | null;
	profile?: { name?: string | null } | null;
}

interface EventMemberTeamMember {
	id: string;
	position?: string | null;
	startedAt?: string | null;
	finishedAt?: string | null;
	team?: {
		projectId?: string | null;
		project?: { id: string; name: string; slug: string } | null;
	} | null;
}

interface EventMemberMentor {
	id: string;
	name: string;
	user?: EventMemberUser | null;
	direction?: { id: string; name: string } | null;
}

interface EventMember {
	id: string;
	createdAt: string;
	status: string;
	user: EventMemberUser;
	teamMemberId?: string | null;
	teamMember?: EventMemberTeamMember | null;
	mentors?: EventMemberMentor[] | null;
}

const formatDate = (value?: string | null) => {
	if (!value) return "";
	const date = new Date(value);
	// Epoch zero is a sentinel for "unset" coming from bad seed data.
	if (date.getTime() === 0) return "";
	return date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
};

const renderMentorsCell = (mentors?: EventMemberMentor[] | null) => {
	if (!mentors?.length) return <Text type="secondary">—</Text>;
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
			{mentors.map((mentor) => {
				const displayName =
					mentor.user?.profile?.name || mentor.user?.name || mentor.name;
				return (
					<div
						key={mentor.id}
						style={{ display: "flex", alignItems: "center", gap: 8 }}
					>
						<Avatar size={20} src={mentor.user?.image ?? undefined}>
							{!mentor.user?.image && displayName ? displayName[0] : null}
						</Avatar>
						<div style={{ lineHeight: 1.2 }}>
							<Text style={{ fontSize: 13 }}>{displayName}</Text>
							<div>
								<Text type="secondary" style={{ fontSize: 11 }}>
									{mentor.name}
								</Text>
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
};

const EventMembersPage = () => {
	const { t } = useTranslate();
	const router = useRouter();
	const eventId = router.query.eventId as string;

	const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
	const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
	const [messageText, setMessageText] = useState("");
	const [editingMember, setEditingMember] = useState<EventMember | null>(null);
	const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

	const { data, isLoading, refetch } = useQuery({
		queryKey: ["event-members", eventId],
		queryFn: () =>
			axios.get<EventMember[]>(`/api/user/event/${eventId}/members`),
		enabled: !!eventId,
	});

	const members = data?.data ?? [];

	const { mutateAsync: sendMessage, isPending: isSending } = useMutation({
		mutationFn: async () => {
			if (!eventId) return;

			await axios.post(`/api/user/event/${eventId}/members/message`, {
				memberIds: selectedRowKeys,
				message: messageText,
			});
		},
		onSuccess: () => {
			message.success(
				t("event.members.message.success", "Message sent successfully"),
			);
			setIsMessageModalOpen(false);
			setMessageText("");
			setSelectedRowKeys([]);
		},
		onError: () => {
			message.error(
				t(
					"event.members.message.error",
					"Failed to send message. Please try again later.",
				),
			);
		},
	});

	const handleOpenMessageModal = () => {
		if (!selectedRowKeys.length) {
			message.warning(
				t(
					"event.members.message.noSelected",
					"Please select at least one member.",
				),
			);
			return;
		}

		setIsMessageModalOpen(true);
	};

	const handleOpenBatchModal = () => {
		if (!selectedRowKeys.length) {
			message.warning(
				t(
					"event.members.batch.noSelected",
					"Please select at least one member.",
				),
			);
			return;
		}

		setIsBatchModalOpen(true);
	};

	const handleSend = async () => {
		if (!messageText.trim()) {
			message.warning(
				t(
					"event.members.message.empty",
					"Please enter a message before sending.",
				),
			);
			return;
		}

		await sendMessage();
	};

	return (
		<ProtectedEventLayout
			title={t("event.members.title", "Event members")}
			description={t(
				"event.members.description",
				"List of users registered for this event.",
			)}
			actions={
				<Space>
					<Button
						disabled={!selectedRowKeys.length}
						onClick={handleOpenBatchModal}
					>
						{t("event.members.actions.batchAssign", "Assign project / curator")}
					</Button>
					<Button
						type="primary"
						disabled={!members.length}
						onClick={handleOpenMessageModal}
					>
						{t("event.members.actions.sendMessage", "Send message")}
					</Button>
				</Space>
			}
		>
			<ModernTable
				rowKey="id"
				loading={isLoading}
				dataSource={members}
				rowSelection={{
					selectedRowKeys,
					onChange: (keys) => setSelectedRowKeys(keys),
				}}
				pagination={false}
				columns={[
					{
						title: t("event.members.user", "User"),
						dataIndex: "user",
						key: "user",
						render: (user: EventMemberUser) => {
							const displayName =
								user?.profile?.name || user?.name || user?.email || "-";

							return (
								<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
									<Avatar src={user?.image ?? undefined}>
										{!user?.image && displayName ? displayName[0] : null}
									</Avatar>
									<div>
										<Text strong>{displayName}</Text>
										{user?.email && (
											<div>
												<Text type="secondary" style={{ fontSize: 12 }}>
													{user.email}
												</Text>
											</div>
										)}
									</div>
								</div>
							);
						},
					},
					{
						title: t("event.members.project", "Project"),
						key: "project",
						render: (_, record) => {
							const tm = record.teamMember;
							const project = tm?.team?.project;
							if (!project) return <Text type="secondary">—</Text>;

							const started = formatDate(tm?.startedAt);
							const finished =
								formatDate(tm?.finishedAt) ||
								t("event.members.present", "present");
							const period = started ? `${started} — ${finished}` : null;

							return (
								<div style={{ lineHeight: 1.3 }}>
									<Text strong>{project.name}</Text>
									{tm?.position && (
										<div>
											<Text type="secondary" style={{ fontSize: 12 }}>
												{tm.position}
											</Text>
										</div>
									)}
									{period && (
										<div>
											<Text type="secondary" style={{ fontSize: 12 }}>
												{period}
											</Text>
										</div>
									)}
								</div>
							);
						},
					},
					{
						title: t("event.members.mentors", "Mentors"),
						dataIndex: "mentors",
						key: "mentors",
						render: (mentors: EventMemberMentor[] | null | undefined) =>
							renderMentorsCell(mentors),
					},
					{
						title: t("event.members.status", "Status"),
						dataIndex: "status",
						key: "status",
						render: (status: string) => (
							<Tag color={status === "Approved" ? "green" : "default"}>
								{status}
							</Tag>
						),
					},
					{
						title: t("event.members.createdAt", "Registered at"),
						dataIndex: "createdAt",
						key: "createdAt",
						render: (value: string) =>
							new Date(value).toLocaleString(undefined, {
								year: "numeric",
								month: "2-digit",
								day: "2-digit",
								hour: "2-digit",
								minute: "2-digit",
							}),
					},
					{
						title: t("event.members.actions", "Actions"),
						key: "actions",
						width: 100,
						render: (_, record) => (
							<Button size="small" onClick={() => setEditingMember(record)}>
								{t("common.edit", "Edit")}
							</Button>
						),
					},
				]}
			/>

			<Modal
				open={isMessageModalOpen}
				title={t("event.members.message.title", "Send message to members")}
				onCancel={() => setIsMessageModalOpen(false)}
				onOk={handleSend}
				okButtonProps={{ loading: isSending }}
			>
				<Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
					{t(
						"event.members.message.subtitle",
						"Your message will be sent to all selected members via notifications.",
					)}
				</Typography.Paragraph>
				<Input.TextArea
					value={messageText}
					onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
						setMessageText(e.target.value)
					}
					rows={4}
					placeholder={t(
						"event.members.message.placeholder",
						"Enter your message for event members...",
					)}
				/>
			</Modal>

			<EditEventMemberModal
				open={!!editingMember}
				eventId={eventId}
				member={editingMember}
				onCancel={() => setEditingMember(null)}
				onSaved={() => {
					setEditingMember(null);
					refetch();
				}}
			/>

			<BatchAssignEventMembersModal
				open={isBatchModalOpen}
				eventId={eventId}
				memberIds={selectedRowKeys.map(String)}
				onCancel={() => setIsBatchModalOpen(false)}
				onSaved={() => {
					setIsBatchModalOpen(false);
					setSelectedRowKeys([]);
					refetch();
				}}
			/>
		</ProtectedEventLayout>
	);
};

export default EventMembersPage;
