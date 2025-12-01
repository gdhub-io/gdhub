import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Avatar, Button, Input, Modal, message, Tag, Typography } from "antd";
import axios from "axios";
import { useRouter } from "next/router";
import type React from "react";
import { useState } from "react";
import ModernTable from "@/components/ModernTable";
import { ProtectedEventLayout } from "@/layouts/ProtectedEventLayout";

const { Text } = Typography;

interface EventMemberUser {
	id: string;
	name?: string | null;
	email?: string | null;
	image?: string | null;
	profile?: {
		name?: string | null;
	} | null;
}

interface EventMember {
	id: string;
	createdAt: string;
	status: string;
	user: EventMemberUser;
}

const EventMembersPage = () => {
	const { t } = useTranslate();
	const router = useRouter();
	const eventId = router.query.eventId as string;

	const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [messageText, setMessageText] = useState("");

	const { data, isLoading } = useQuery({
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
			setIsModalOpen(false);
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

	const handleOpenModal = () => {
		if (!selectedRowKeys.length) {
			message.warning(
				t(
					"event.members.message.noSelected",
					"Please select at least one member.",
				),
			);
			return;
		}

		setIsModalOpen(true);
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
				<Button
					type="primary"
					disabled={!members.length}
					onClick={handleOpenModal}
				>
					{t("event.members.actions.sendMessage", "Send message")}
				</Button>
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
				]}
			/>

			<Modal
				open={isModalOpen}
				title={t("event.members.message.title", "Send message to members")}
				onCancel={() => setIsModalOpen(false)}
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
		</ProtectedEventLayout>
	);
};

export default EventMembersPage;
