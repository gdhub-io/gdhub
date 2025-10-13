import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { MdOutlineSupportAgent } from "@react-icons/all-files/md/MdOutlineSupportAgent";
import { IconBan, IconCancel, IconCheck, IconClock } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Avatar, Button, Flex, message, Space, Spin, Typography } from "antd";
import axios from "axios";
import Link from "next/link";
import { useSession } from "next-auth/react";
import qs from "qs";
import type React from "react";
import { useMemo, useState } from "react";
import { useChat } from "../Chat/useChat";
import ExpertRequestModal from "../modals/ExpertRequestModal";
import { TextWithLineBreak } from "../TextWithLineBreak";
import styles from "./styles.module.scss";

const { Title, Text } = Typography;

type RequestCardData = prismaClient.AdviceRequest & {
	fromUser?: prismaClient.User & { profile: prismaClient.Profile };
	toUser: prismaClient.User & { profile: prismaClient.Profile };
	fromTelegramUser?: { name: string; image: string };
	project?: prismaClient.Project;
};

const MyAdviceRequests: React.FC<{ showTitle?: boolean }> = ({
	showTitle = true,
}) => {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const [selectedAdviceRequestId, setSelectedAdviceRequestId] = useState<
		string | undefined
	>(undefined);
	const { setSelectedRoomByAlias, setOpenChatModal } = useChat();

	const { data, isLoading, isFetched, refetch } = useQuery({
		queryKey: ["advice-requests"],
		queryFn: () =>
			axios.get("/api/user/advice-requests", {
				params: {
					status: [
						prismaClient.AdviceRequestStatus.Created,
						prismaClient.AdviceRequestStatus.Approved,
					],
				},
				paramsSerializer: (params) =>
					qs.stringify(params, { arrayFormat: "repeat" }),
			}),
	});

	const { mutateAsync: acceptAdviceRequest, isPending: isAccepting } =
		useMutation({
			mutationFn: (adviceRequestId: string) =>
				axios
					.put(`/api/user/advice-request/${adviceRequestId}/accept`)
					.then((res) => res.data),
			onSuccess: () => {
				handleRequestsChange();

				message.success(
					t(
						"page.hub.advice-requests.accepted",
						"Advice request accepted successfully. You can chat now.",
					),
				);
			},
			onError: () => {
				message.error(t("Advice request accepted error"));
			},
		});

	const { mutateAsync: rejectAdviceRequest, isPending: isRejecting } =
		useMutation({
			mutationFn: (adviceRequestId: string) =>
				axios
					.put(`/api/user/advice-request/${adviceRequestId}/reject`)
					.then((res) => res.data),
			onSuccess: () => {
				handleRequestsChange();

				message.success(t("Advice request rejected successfully"));
			},
			onError: () => {
				message.error(t("Advice request rejected error"));
			},
		});

	const userId = session?.user?.id;
	const incoming = useMemo(
		() => (data ? data.data.filter((r: any) => r.toUser?.id === userId) : []),
		[data, userId],
	);
	const outgoing = useMemo(
		() => (data ? data.data.filter((r: any) => r.fromUser?.id === userId) : []),
		[data, userId],
	);

	const handleRequestsChange = () => {
		refetch();
		setSelectedAdviceRequestId(undefined);
	};

	const handleOpenRequestChat = async (adviceRequestId: string) => {
		await setSelectedRoomByAlias(`advreq-${adviceRequestId}`);
		setOpenChatModal(true);
		setSelectedAdviceRequestId(undefined);
	};

	const handleAcceptRequest = (adviceRequestId: string) => {
		acceptAdviceRequest(adviceRequestId);
		setSelectedAdviceRequestId(undefined);
	};

	const handleRejectRequest = (adviceRequestId: string) => {
		rejectAdviceRequest(adviceRequestId);
		setSelectedAdviceRequestId(undefined);
	};

	if (
		!isFetched ||
		(!isLoading && incoming.length === 0 && outgoing.length === 0)
	) {
		return null;
	}

	return (
		<div className={styles.adviceRequestsContainer}>
			<Flex justify="space-between" align="center" wrap>
				{showTitle && (
					<Space>
						<MdOutlineSupportAgent size={36} />
						<Title level={2}>
							{t("page.hub.advice-requests", "Advice Requests")}
						</Title>
					</Space>
				)}
			</Flex>
			<Space direction="vertical" size={32} style={{ width: "100%" }}>
				{incoming.length > 0 && (
					<div>
						<Title level={4}>
							{t("page.hub.incoming-requests", "Incoming")}
						</Title>
						{isLoading ? (
							<Spin />
						) : (
							<div className={styles.requestsList}>
								{incoming.map((req: any) => (
									<RequestCard
										key={req.id}
										req={req}
										type="incoming"
										isAccepting={isAccepting}
										isRejecting={isRejecting}
										onReply={handleOpenRequestChat}
										onView={setSelectedAdviceRequestId}
										onAccept={handleAcceptRequest}
										onReject={handleRejectRequest}
									/>
								))}
							</div>
						)}
					</div>
				)}
				{outgoing.length > 0 && (
					<div>
						<Title level={4}>
							{t("page.hub.outgoing-requests", "Outgoing")}
						</Title>
						{isLoading ? (
							<Spin />
						) : (
							<div className={styles.requestsList}>
								{outgoing.map((req: any) => (
									<RequestCard
										key={req.id}
										req={req}
										type="outgoing"
										isAccepting={isAccepting}
										isRejecting={isRejecting}
										onView={setSelectedAdviceRequestId}
										onReply={handleOpenRequestChat}
									/>
								))}
							</div>
						)}
					</div>
				)}
			</Space>

			<ExpertRequestModal
				adviceRequestId={selectedAdviceRequestId}
				open={!!selectedAdviceRequestId}
				onCancel={() => setSelectedAdviceRequestId(undefined)}
				onUpdate={() => handleRequestsChange()}
			/>
		</div>
	);
};

const getStatusIcon = (status: string) => {
	switch (status) {
		case "Approved":
			return (
				<IconCheck
					size={18}
					style={{ color: "#52c41a", background: "#fff", borderRadius: "50%" }}
				/>
			);
		case "Rejected":
			return (
				<IconCancel
					size={18}
					style={{ color: "#ff4d4f", background: "#fff", borderRadius: "50%" }}
				/>
			);
		case "Closed":
			return (
				<IconBan
					size={18}
					style={{ color: "#888", background: "#fff", borderRadius: "50%" }}
				/>
			);
		default:
			return (
				<IconClock
					size={18}
					style={{ color: "#1890ff", background: "#fff", borderRadius: "50%" }}
				/>
			);
	}
};

const RequestCard: React.FC<{
	req: RequestCardData;
	type: "incoming" | "outgoing";
	isAccepting: boolean;
	isRejecting: boolean;
	onView: (adviceRequestId: string) => void;
	onReply: (adviceRequestId: string) => void;
	onAccept?: (adviceRequestId: string) => void;
	onReject?: (adviceRequestId: string) => void;
}> = ({
	req,
	type,
	isAccepting,
	isRejecting,
	onView,
	onReply,
	onAccept = () => {},
	onReject = () => {},
}) => {
	const { t } = useTranslate();
	const fromUserName = useMemo(
		() =>
			req.fromUser ? req.fromUser.profile.name : req.fromTelegramUser?.name,
		[req],
	);
	const toUserName = useMemo(
		() => (req.toUser ? req.toUser.profile.name : t("Unknown")),
		[req, t],
	);

	return (
		<div className={styles.requestCard}>
			<Flex align="center" gap={16}>
				<div style={{ position: "relative", display: "inline-block" }}>
					<Avatar
						src={type === "incoming" ? req.fromUser?.image : req.toUser?.image}
					/>
					<span
						style={{
							position: "absolute",
							bottom: -8,
							right: -2,
							background: "transparent",
							borderRadius: "50%",
							zIndex: 2,
						}}
					>
						{getStatusIcon(req.status)}
					</span>
				</div>
				<Flex vertical>
					<Text>
						{type === "incoming" ? `From ${fromUserName}` : `To ${toUserName}`}
					</Text>

					<Text strong>Topic: {req.topic}</Text>

					<Space align="start" size={16}>
						<Text>Project</Text>
						<Space size={[8, 8]} wrap>
							{req.project && (
								<Space key={req.project.id} align="center" size={8}>
									<Avatar
										src={req.project.coverImage}
										shape="square"
										size={24}
									/>
									<Link href={`/project/${req.project.slug}`} target="_blank">
										<Text>{req.project.name}</Text>
									</Link>
								</Space>
							)}
						</Space>
					</Space>

					{!!req.comment && (
						<Text type="secondary">
							<TextWithLineBreak text={req.comment} />
						</Text>
					)}
				</Flex>
				<div
					style={{
						marginLeft: "auto",
						color: "#888",
						display: "flex",
						alignItems: "center",
						gap: 8,
					}}
				>
					{type === "incoming" ? (
						req.status === "Created" ? (
							<>
								<Button
									type="primary"
									loading={isAccepting}
									size="small"
									onClick={() => onAccept(req.id)}
								>
									Accept
								</Button>
								<Button
									type="default"
									loading={isRejecting}
									size="small"
									onClick={() => onReject(req.id)}
								>
									Reject
								</Button>
							</>
						) : req.status === "Approved" ? (
							<Button size="small" onClick={() => onReply(req.id)}>
								Chat
							</Button>
						) : (
							<Button size="small" onClick={() => onView(req.id)}>
								View
							</Button>
						)
					) : (
						<Button size="small" onClick={() => onView(req.id)}>
							View
						</Button>
					)}
				</div>
			</Flex>
		</div>
	);
};

export default MyAdviceRequests;
