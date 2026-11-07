import type {
	AdviceRequest,
	Profile,
	Project,
	User,
} from "@gdhub-io/gdhub-prisma";
import {
	IconBan,
	IconCancel,
	IconCheck,
	IconChevronRight,
	IconClock,
	IconHeadset,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, message, Space, Typography } from "antd";
import axios from "axios";
import Link from "next/link";
import { useSession } from "next-auth/react";
import qs from "qs";
import type React from "react";
import { useMemo, useState } from "react";
import {
	getHubSectionShellClass,
	HubSectionBody,
	HubSectionHeader,
} from "@/components/hub/HubSection";
import { HubSectionRowsSkeleton } from "@/components/hub/HubSidebarSkeleton";
import hubSection from "@/components/hub/hubSection.module.scss";
import { EmptyState, ViewAllLink } from "@/components/ui";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { AdviceRequestStatus } from "@/config/prisma-enums";
import { useChat } from "../Chat/useChat";
import ExpertRequestModal from "../modals/ExpertRequestModal";
import { TextWithLineBreak } from "../TextWithLineBreak";
import { AdviceRequestsSkeleton } from "./AdviceRequestsSkeleton";
import styles from "./styles.module.scss";

const { Title, Text } = Typography;

type RequestCardData = AdviceRequest & {
	fromUser?: User & { profile: Profile };
	toUser: User & { profile: Profile };
	fromTelegramUser?: { name: string; image: string };
	project?: Project;
};

const MyAdviceRequests: React.FC<{
	showTitle?: boolean;
	/** hub: bordered main-column card; hubSidebar: head+body only — wrap with `sectionCardSidebar` on hub page */
	variant?: "default" | "hub" | "hubSidebar";
	/** hubSidebar inside hub `mainSectionsBundle` — no nested rounded card */
	embedInMainBundle?: boolean;
	bundleSlotClassName?: string;
}> = ({
	showTitle = true,
	variant = "default",
	embedInMainBundle = false,
	bundleSlotClassName,
}) => {
	const { t } = useTranslate();
	const { data: session } = useSession();
	const [selectedAdviceRequestId, setSelectedAdviceRequestId] = useState<
		string | undefined
	>(undefined);
	const { setSelectedRoomId, setSelectedRoomByAlias, setOpenChatModal } =
		useChat();

	const { data, isPending, refetch } = useQuery({
		queryKey: ["advice-requests"],
		queryFn: () =>
			axios
				.get<RequestCardData[]>("/api/user/advice-requests", {
					params: {
						status: [AdviceRequestStatus.Created, AdviceRequestStatus.Approved],
					},
					paramsSerializer: (params) =>
						qs.stringify(params, { arrayFormat: "repeat" }),
				})
				.then((res) => res.data),
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
		() => (data ? data.filter((r) => r.toUser?.id === userId) : []),
		[data, userId],
	);
	const outgoing = useMemo(
		() => (data ? data.filter((r) => r.fromUser?.id === userId) : []),
		[data, userId],
	);

	const handleRequestsChange = () => {
		refetch();
		setSelectedAdviceRequestId(undefined);
	};

	const handleOpenRequestChat = async (adviceRequestId: string) => {
		// Rooms created via the registry have no `advreq-*` alias — open by the
		// stored room id; the alias remains only as a legacy fallback.
		const record = data?.find((r) => r.id === adviceRequestId);
		if (record?.matrixRoomId) {
			setSelectedRoomId(record.matrixRoomId);
		} else {
			await setSelectedRoomByAlias(`advreq-${adviceRequestId}`);
		}
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

	const isHubLayout = variant === "hub" || variant === "hubSidebar";

	const HUB_LIST_PREVIEW = 5;
	const incomingShown = useMemo(
		() => (isHubLayout ? incoming.slice(0, HUB_LIST_PREVIEW) : incoming),
		[isHubLayout, incoming],
	);
	const outgoingShown = useMemo(
		() => (isHubLayout ? outgoing.slice(0, HUB_LIST_PREVIEW) : outgoing),
		[isHubLayout, outgoing],
	);

	const isEmpty = incoming.length === 0 && outgoing.length === 0;

	const stackGap =
		incoming.length > 0 && outgoing.length > 0 && !isHubLayout ? 20 : 0;

	const stacksDefault = (
		<Flex vertical gap={stackGap}>
			{incoming.length > 0 && (
				<div>
					<Title level={4}>{t("page.hub.incoming-requests", "Incoming")}</Title>
					<div className={styles.requestsList}>
						{incomingShown.map((req) => (
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
				</div>
			)}
			{incoming.length > 0 && outgoing.length > 0 ? (
				<hr className={hubSection.sectionDivider} />
			) : null}
			{outgoing.length > 0 && (
				<div>
					<Title level={4}>{t("page.hub.outgoing-requests", "Outgoing")}</Title>
					<div className={styles.requestsList}>
						{outgoingShown.map((req) => (
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
				</div>
			)}
		</Flex>
	);

	const stacksHub = (
		<>
			{incomingShown.length > 0 && (
				<div className={styles.hubListBlock}>
					<div className={hubSection.sectionSubheading}>
						{t("page.hub.incoming-requests", "Incoming")}
					</div>
					<div className={`${styles.hubList} ${hubSection.sidebarListBleed}`}>
						{incomingShown.map((req) => (
							<AdviceHubListRow
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
				</div>
			)}
			{incomingShown.length > 0 && outgoingShown.length > 0 ? (
				<div className={styles.hubListBlockSpacer} aria-hidden />
			) : null}
			{outgoingShown.length > 0 && (
				<div className={styles.hubListBlock}>
					<div className={hubSection.sectionSubheading}>
						{t("page.hub.outgoing-requests", "Outgoing")}
					</div>
					<div className={`${styles.hubList} ${hubSection.sidebarListBleed}`}>
						{outgoingShown.map((req) => (
							<AdviceHubListRow
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
				</div>
			)}
		</>
	);

	const emptyState = (
		<EmptyState
			size={isHubLayout ? "compact" : "default"}
			icon={IconHeadset}
			title={t("page.hub.advice-requests.empty", "No advice requests")}
			description={t(
				"page.hub.advice-requests.empty-hint",
				"Requests you send to experts, and the ones sent to you, appear here.",
			)}
		/>
	);

	const stacks = isPending ? (
		isHubLayout ? (
			<div className={hubSection.sidebarListBleed}>
				<HubSectionRowsSkeleton media="circle" />
			</div>
		) : (
			<AdviceRequestsSkeleton />
		)
	) : isEmpty ? (
		emptyState
	) : isHubLayout ? (
		stacksHub
	) : (
		stacksDefault
	);

	const hubInner = (
		<>
			{showTitle && (
				<HubSectionHeader
					title={t("page.hub.advice-requests", "Advice Requests")}
				>
					{isHubLayout && (
						<ViewAllLink
							href="/user/advice-requests"
							label={t("hub.view-all", "View all")}
						/>
					)}
				</HubSectionHeader>
			)}
			<HubSectionBody>{stacks}</HubSectionBody>
		</>
	);

	const body =
		variant === "hubSidebar" && embedInMainBundle ? (
			<div
				className={[getHubSectionShellClass("inset"), bundleSlotClassName]
					.filter(Boolean)
					.join(" ")}
			>
				{hubInner}
			</div>
		) : variant === "hubSidebar" ? (
			<section className={getHubSectionShellClass("sidebar")}>
				{hubInner}
			</section>
		) : variant === "hub" ? (
			<div className={getHubSectionShellClass("main")}>{hubInner}</div>
		) : (
			<div className={styles.adviceRequestsContainer}>
				<Flex justify="space-between" align="center" wrap>
					{showTitle && (
						<Space>
							<IconHeadset size={36} />
							<Title level={2}>
								{t("page.hub.advice-requests", "Advice Requests")}
							</Title>
						</Space>
					)}
				</Flex>
				<Space orientation="vertical" size={32} style={{ width: "100%" }}>
					{stacks}
				</Space>
			</div>
		);

	return (
		<>
			{body}

			<ExpertRequestModal
				adviceRequestId={selectedAdviceRequestId}
				open={!!selectedAdviceRequestId}
				onCancel={() => setSelectedAdviceRequestId(undefined)}
				onUpdate={() => handleRequestsChange()}
			/>
		</>
	);
};

const AdviceHubListRow: React.FC<{
	req: RequestCardData;
	type: "incoming" | "outgoing";
	isAccepting: boolean;
	isRejecting: boolean;
	onView: (adviceRequestId: string) => void;
	onReply: (adviceRequestId: string) => void | Promise<void>;
	onAccept?: (adviceRequestId: string) => void;
	onReject?: (adviceRequestId: string) => void;
}> = ({
	req,
	type,
	isAccepting,
	isRejecting,
	onView,
	onReply,
	onAccept,
	onReject,
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

	const secondaryLine = [
		type === "incoming"
			? `${t("page.hub.advice-from-prefix", "From")} ${fromUserName}`
			: `${t("page.hub.advice-to-prefix", "To")} ${toUserName}`,
		req.project?.name,
	]
		.filter(Boolean)
		.join(" · ");

	const main = (
		<div className={styles.hubListRowMain}>
			<AppAvatar
				size={28}
				className={styles.hubAvatar}
				src={type === "incoming" ? req.fromUser?.image : req.toUser?.image}
			/>
			<div className={styles.hubTextWrap}>
				<div className={styles.hubPrimary} title={req.topic ?? undefined}>
					{req.topic}
				</div>
				<div className={styles.hubSecondary} title={secondaryLine}>
					{secondaryLine}
				</div>
			</div>
		</div>
	);

	if (type === "incoming" && req.status === "Created") {
		return (
			<div className={styles.hubListRow}>
				{main}
				<div className={styles.hubListRowActions}>
					<Button
						type="primary"
						size="small"
						loading={isAccepting}
						onClick={() => onAccept?.(req.id)}
					>
						Accept
					</Button>
					<Button
						size="small"
						loading={isRejecting}
						onClick={() => onReject?.(req.id)}
					>
						Reject
					</Button>
				</div>
			</div>
		);
	}

	const handleRowActivate = () => {
		if (req.status === "Approved") {
			void onReply(req.id);
		} else {
			onView(req.id);
		}
	};

	return (
		<button
			type="button"
			className={styles.hubListRowButton}
			onClick={handleRowActivate}
		>
			{main}
			<IconChevronRight className={styles.hubItemIcon} aria-hidden />
		</button>
	);
};

const getStatusIcon = (status: string) => {
	switch (status) {
		case "Approved":
			return (
				<IconCheck
					size={18}
					style={{
						color: "var(--gd-success-solid)",
						background: "var(--gd-color-surface)",
						borderRadius: "50%",
					}}
				/>
			);
		case "Rejected":
			return (
				<IconCancel
					size={18}
					style={{
						color: "var(--gd-danger-solid)",
						background: "var(--gd-color-surface)",
						borderRadius: "50%",
					}}
				/>
			);
		case "Closed":
			return (
				<IconBan
					size={18}
					style={{
						color: "var(--gd-color-text-secondary)",
						background: "var(--gd-color-surface)",
						borderRadius: "50%",
					}}
				/>
			);
		default:
			return (
				<IconClock
					size={18}
					style={{
						color: "var(--gd-info-solid)",
						background: "var(--gd-color-surface)",
						borderRadius: "50%",
					}}
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
					<AppAvatar
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
				<Flex vertical className={styles.requestCardMain}>
					<Text>
						{type === "incoming" ? `From ${fromUserName}` : `To ${toUserName}`}
					</Text>

					<Text strong>Topic: {req.topic}</Text>

					<Space align="start" size={16}>
						<Text>Project</Text>
						<Space size={[8, 8]} wrap>
							{req.project && (
								<Space key={req.project.id} align="center" size={8}>
									<AppAvatar
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
				<div className={styles.requestCardActions}>
					{type === "incoming" ? (
						req.status === "Created" ? (
							<>
								<Button
									type="primary"
									loading={isAccepting}
									onClick={() => onAccept(req.id)}
								>
									Accept
								</Button>
								<Button
									type="default"
									loading={isRejecting}
									onClick={() => onReject(req.id)}
								>
									Reject
								</Button>
							</>
						) : req.status === "Approved" ? (
							<Button onClick={() => onReply(req.id)}>Chat</Button>
						) : (
							<Button onClick={() => onView(req.id)}>View</Button>
						)
					) : (
						<Space>
							{req.status === "Approved" ? (
								<Button onClick={() => onReply(req.id)}>Chat</Button>
							) : (
								<Button type="primary" onClick={() => onView(req.id)}>
									View
								</Button>
							)}
						</Space>
					)}
				</div>
			</Flex>
		</div>
	);
};

export default MyAdviceRequests;
