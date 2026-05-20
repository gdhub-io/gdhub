"use client";

import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import {
	IconDotsVertical,
	IconDownload,
	IconEye,
	IconFile,
	IconFilePlus,
	IconMail,
	IconPencil,
	IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	Avatar,
	Button,
	Dropdown,
	Input,
	type MenuProps,
	Modal,
	message,
	Space,
	Tag,
	Typography,
} from "antd";
import axios from "axios";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import type React from "react";
import { useCallback, useState } from "react";
import ModernTable from "@/components/ModernTable";
import BatchAssignEventMembersModal from "@/components/modals/BatchAssignEventMembersModal";
import EditEventMemberModal from "@/components/modals/EditEventMemberModal";
import { hasRole } from "@/helpers/user";
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

type CertificateStatus = "DRAFT" | "PENDING" | "COMPLETED" | "REJECTED";

interface EventMemberCertificate {
	id: string;
	number: string;
	externalId: string;
	issuedAt: string;
	status?: CertificateStatus | null;
	documentUrl?: string | null;
}

interface EventMember {
	id: string;
	createdAt: string;
	status: string;
	user: EventMemberUser;
	teamMemberId?: string | null;
	teamMember?: EventMemberTeamMember | null;
	mentors?: EventMemberMentor[] | null;
	certificate?: EventMemberCertificate | null;
}

interface EventCertificationFields {
	certificationEnabled?: boolean | null;
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

export default function EventMembersPage() {
	const { t } = useTranslate();
	const params = useParams<{ eventId?: string }>();
	const session = useSession();
	const isAdmin = hasRole(prismaClient.UserRole.Admin, session);
	const eventId = params?.eventId as string;
	const [confirmModal, confirmModalContextHolder] = Modal.useModal();
	const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
	const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
	const [messageText, setMessageText] = useState("");
	const [editingMember, setEditingMember] = useState<EventMember | null>(null);
	const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
	const [creatingMemberId, setCreatingMemberId] = useState<string | null>(null);
	const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
	const [distributingMemberId, setDistributingMemberId] = useState<
		string | null
	>(null);

	const { data, isLoading, refetch } = useQuery({
		queryKey: ["event-members", eventId],
		queryFn: () =>
			axios.get<EventMember[]>(`/api/user/event/${eventId}/members`),
		enabled: !!eventId,
	});

	const { data: eventData } = useQuery({
		queryKey: ["event-certification-fields", eventId],
		queryFn: () =>
			axios
				.get<EventCertificationFields>(`/api/user/event/${eventId}`)
				.then((r) => r.data),
		enabled: !!eventId,
		refetchOnWindowFocus: false,
	});

	const certificationEnabled = !!eventData?.certificationEnabled;

	const { mutateAsync: createCertificate } = useMutation({
		mutationFn: (memberId: string) =>
			axios.post(`/api/user/event/${eventId}/members/${memberId}/certificate`),
		onMutate: (memberId) => {
			setCreatingMemberId(memberId);
		},
		onSettled: () => {
			setCreatingMemberId(null);
		},
		onSuccess: () => {
			message.success(
				t("event.members.certificate.create.success", "Certificate created"),
			);
			refetch();
		},
		onError: (err: unknown) => {
			const msg =
				(err as { response?: { data?: { message?: string } } })?.response?.data
					?.message ||
				t(
					"event.members.certificate.create.error",
					"Failed to create certificate",
				);
			message.error(msg);
		},
	});

	const { mutateAsync: distributeCertificate } = useMutation({
		mutationFn: (memberId: string) =>
			axios.post(
				`/api/user/event/${eventId}/members/${memberId}/certificate/distribute`,
			),
		onMutate: (memberId) => {
			setDistributingMemberId(memberId);
		},
		onSettled: () => {
			setDistributingMemberId(null);
		},
		onSuccess: () => {
			message.success(
				t("event.members.certificate.distribute.success", "Sent for signing"),
			);
			refetch();
		},
		onError: (err: unknown) => {
			const msg =
				(err as { response?: { data?: { message?: string } } })?.response?.data
					?.message ||
				t(
					"event.members.certificate.distribute.error",
					"Failed to send for signing",
				);
			message.error(msg);
		},
	});

	const { mutateAsync: deleteCertificate } = useMutation({
		mutationFn: (memberId: string) =>
			axios.delete(
				`/api/user/event/${eventId}/members/${memberId}/certificate`,
			),
		onMutate: (memberId) => {
			setDeletingMemberId(memberId);
		},
		onSettled: () => {
			setDeletingMemberId(null);
		},
		onSuccess: () => {
			message.success(
				t("event.members.certificate.delete.success", "Certificate deleted"),
			);
			refetch();
		},
		onError: () => {
			message.error(
				t(
					"event.members.certificate.delete.error",
					"Failed to delete certificate",
				),
			);
		},
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

	const renderItems: (record: EventMember) => MenuProps["items"] = useCallback(
		(record) => {
			const items: NonNullable<MenuProps["items"]> = [
				{
					key: "edit",
					label: t("event.members.certificate.edit", "Edit"),
					icon: <IconPencil />,
					onClick: () => setEditingMember(record),
				},
			];

			if (!certificationEnabled) {
				return items;
			}

			const cert = record.certificate;

			if (!cert) {
				items.push({
					key: "create-certificate",
					label: t("event.members.certificate.create", "Create certificate"),
					icon: <IconFilePlus />,
					onClick: () => createCertificate(record.id),
				});
				return items;
			}

			const status = cert.status ?? "DRAFT";
			const isDraft = status === "DRAFT";
			const isCompleted = status === "COMPLETED";

			const children: NonNullable<MenuProps["items"]> = [
				{
					key: "view-certificate",
					label: t("event.members.certificate.view", "View in Documenso"),
					icon: <IconEye />,
					disabled: !cert.documentUrl,
					onClick: () => {
						if (cert.documentUrl) {
							window.open(cert.documentUrl, "_blank", "noopener,noreferrer");
						}
					},
				},
				{
					key: "distribute-certificate",
					label: t("event.members.certificate.distribute", "Send for signing"),
					icon: <IconMail />,
					disabled: !isDraft,
					onClick: () =>
						confirmModal.confirm({
							title: t(
								"event.members.certificate.distribute.confirm",
								"Send for signing?",
							),
							okText: t("event.members.certificate.distribute.send", "Send"),
							content: t(
								"event.members.certificate.distribute.confirmDesc",
								"Signers will receive an email from Documenso. After signing, the certificate will be available in the member",
							),
							okButtonProps: { danger: true },
							cancelText: t("common.cancel", "Cancel"),
							onOk: () => distributeCertificate(record.id),
						}),
				},
			];

			if (isCompleted) {
				children.push({
					key: "download-certificate",
					label: t("event.members.certificate.download", "Download PDF"),
					icon: <IconDownload />,
					onClick: () =>
						window.open(
							`/api/user/event/${eventId}/members/${record.id}/certificate/download`,
							"_blank",
							"noopener,noreferrer",
						),
				});
			}

			children.push(
				{
					key: "divider",
					type: "divider",
				},
				{
					key: "delete-certificate",
					label: t("event.members.certificate.delete", "Delete certificate"),
					icon: <IconTrash />,
					danger: true,
					disabled: !(isDraft || (isCompleted && isAdmin)),
					onClick: () =>
						confirmModal.confirm({
							title: t(
								"event.members.certificate.delete.confirm",
								"Delete certificate?",
							),
							content: t(
								"event.members.certificate.delete.confirmDesc",
								"The document will be removed from Documenso as well.",
							),
							okText: t("common.delete", "Delete"),
							okButtonProps: { danger: true },
							cancelText: t("common.cancel", "Cancel"),
							onOk: () => deleteCertificate(record.id),
						}),
				},
			);

			items.push({
				key: "certificate",
				label: t("event.members.certificate.certificate", "Certificate"),
				icon: <IconFile />,
				children,
			});

			return items;
		},
		[
			t,
			certificationEnabled,
			isAdmin,
			eventId,
			confirmModal,
			createCertificate,
			distributeCertificate,
			deleteCertificate,
		],
	);

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
			{confirmModalContextHolder}

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
					...(certificationEnabled
						? [
								{
									title: t("event.members.certificate", "Certificate"),
									dataIndex: "certificate",
									key: "certificate",
									render: (certificate: EventMemberCertificate) => {
										if (!certificate) return <Text type="secondary">—</Text>;

										return (
											<Space>
												<Text copyable>{certificate.number}</Text>
												<Tag
													color={
														certificate.status === "COMPLETED"
															? "success"
															: certificate.status === "PENDING"
																? "processing"
																: "default"
													}
												>
													{certificate.status || "unknown"}
												</Tag>
											</Space>
										);
									},
								},
							]
						: []),
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
						align: "right",
						render: (_, record) => {
							return (
								<Dropdown
									menu={{ items: renderItems(record) }}
									trigger={["click"]}
									placement="bottomRight"
								>
									<Button
										type="text"
										size="small"
										icon={<IconDotsVertical size={16} />}
									/>
								</Dropdown>

								// <Space size={6} wrap>
								// 	<Button size="small" onClick={() => setEditingMember(record)}>
								// 		{t("common.edit", "Edit")}
								// 	</Button>
								// 	{cert ? (
								// 		<Space size={6} wrap>
								// 			<Tag color="blue">{cert.number}</Tag>
								// 			<Tag color={statusMeta[status].color}>
								// 				{statusMeta[status].label}
								// 			</Tag>

								// 			{cert.documentUrl && (
								// 				<Button
								// 					size="small"
								// 					onClick={() =>
								// 						window.open(
								// 							cert.documentUrl ?? undefined,
								// 							"_blank",
								// 							"noopener,noreferrer",
								// 						)
								// 					}
								// 				>
								// 					{t(
								// 						"event.members.certificate.viewInDocumenso",
								// 						"View in Documenso",
								// 					)}
								// 				</Button>
								// 			)}
								// 			{status === "DRAFT" && (
								// 				<Popconfirm
								// 					title={t(
								// 						"event.members.certificate.distribute.confirm",
								// 						"Send for signing?",
								// 					)}
								// 					description={t(
								// 						"event.members.certificate.distribute.confirmDesc",
								// 						"Signers will receive an email from Documenso.",
								// 					)}
								// 					okText={t(
								// 						"event.members.certificate.distribute.send",
								// 						"Send",
								// 					)}
								// 					cancelText={t("common.cancel", "Cancel")}
								// 					onConfirm={() => distributeCertificate(record.id)}
								// 				>
								// 					<Button
								// 						size="small"
								// 						type="primary"
								// 						loading={distributingMemberId === record.id}
								// 					>
								// 						{t(
								// 							"event.members.certificate.distribute",
								// 							"Send for signing",
								// 						)}
								// 					</Button>
								// 				</Popconfirm>
								// 			)}
								// 			<Popconfirm
								// 				title={t(
								// 					"event.members.certificate.delete.confirm",
								// 					"Delete this certificate?",
								// 				)}
								// 				description={t(
								// 					"event.members.certificate.delete.confirmDesc",
								// 					"The document will be removed from Documenso as well.",
								// 				)}
								// 				okText={t("common.delete", "Delete")}
								// 				okButtonProps={{ danger: true }}
								// 				cancelText={t("common.cancel", "Cancel")}
								// 				onConfirm={() => deleteCertificate(record.id)}
								// 			>
								// 				<Button
								// 					size="small"
								// 					danger
								// 					loading={deletingMemberId === record.id}
								// 				>
								// 					{t("event.members.certificate.delete", "Delete")}
								// 				</Button>
								// 			</Popconfirm>
								// 		</Space>
								// 	) : (
								// 		<Button
								// 			size="small"
								// 			type="primary"
								// 			disabled={!certificationEnabled}
								// 			title={
								// 				certificationEnabled
								// 					? undefined
								// 					: t(
								// 							"event.members.certificate.disabled",
								// 							"Enable certification in event settings first",
								// 						)
								// 			}
								// 			loading={creatingMemberId === record.id}
								// 			onClick={() => createCertificate(record.id)}
								// 		>
								// 			{t(
								// 				"event.members.certificate.create",
								// 				"Create Certificate",
								// 			)}
								// 		</Button>
								// 	)}
								// </Space>
							);
						},
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
}
