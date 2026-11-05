import {
	IconArrowLeft,
	IconInfoCircle,
	IconLock,
	IconMoodSmile,
	IconSpeakerphone,
	IconX,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Popover, Skeleton } from "antd";
import type { ComponentType, ReactNode } from "react";
import { EmptyState, StatusDot } from "@/components/ui";
import { GdhubAvatar } from "../AnnouncementsAvatar";
import { ChatContextLine } from "../ChatContextLine";
import type { ChatContextSlot } from "../ChatContextLine/kinds";
import { MatrixAvatar } from "../MatrixAvatar";
import styles from "./style.module.scss";

export type ConversationState = "loading" | "unavailable" | "ready";

type ChatConversationProps = {
	name: string;
	avatarMxc?: string | null;
	presence?: "online" | "invitation" | null;
	/** Second header line when there is no presence to show. */
	subtitle?: ReactNode;
	/** Replaces the room's Matrix avatar. */
	avatar?: ReactNode;
	context?: ChatContextSlot | null;
	state: ConversationState;
	onBack: () => void;
	onClose: () => void;
	/** The timeline, or the invite that replaces it. */
	children?: ReactNode;
	/** The composer or the read-only banner. */
	footer?: ReactNode;
	/** What the info button left of close explains. */
	info?: ReactNode;
};

function ConversationSkeleton() {
	return (
		<div className={styles.skeleton}>
			{[false, true, false, false, true].map((own, i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
					key={i}
					className={styles.skeletonMessage}
					data-own={own || undefined}
				>
					{!own && <Skeleton.Avatar active size={32} />}
					<Skeleton.Input
						active
						size="large"
						style={{ width: own ? 180 : 240 }}
					/>
				</div>
			))}
		</div>
	);
}

/** One conversation inside the chat panel. Frames `YGPUq`, `B9jTEp`, `ZMcrW`. */
export function ChatConversation({
	name,
	avatarMxc,
	presence,
	subtitle,
	avatar,
	context,
	state,
	onBack,
	onClose,
	children,
	footer,
	info,
}: ChatConversationProps) {
	const { t } = useTranslate();

	return (
		<div className={styles.conversation}>
			<div className={styles.header}>
				<Button
					type="text"
					icon={<IconArrowLeft size={20} />}
					aria-label={t("chat.panel.back", "Back to messages")}
					onClick={onBack}
				/>
				{state === "loading" && !name ? (
					<Skeleton.Input active size="small" className={styles.who} />
				) : (
					<div className={styles.who}>
						{avatar ?? (
							<MatrixAvatar mxcUrl={avatarMxc} size={32}>
								{name.slice(0, 1).toUpperCase()}
							</MatrixAvatar>
						)}
						<div className={styles.whoText}>
							<span className={styles.name}>{name}</span>
							{!presence && subtitle && (
								<span className={styles.subtitle}>{subtitle}</span>
							)}
							{presence && (
								<StatusDot
									tone={presence === "online" ? "success" : "info"}
									label={
										presence === "online"
											? t("chat.presence.online", "Online")
											: t("chat.presence.invitation", "Invitation")
									}
								/>
							)}
						</div>
					</div>
				)}
				{info && (
					<Popover
						trigger="click"
						placement="bottomRight"
						content={<div className={styles.info}>{info}</div>}
					>
						<Button
							type="text"
							icon={<IconInfoCircle size={20} />}
							aria-label={t("chat.panel.info", "About this chat")}
						/>
					</Popover>
				)}
				<Button
					type="text"
					icon={<IconX size={20} />}
					aria-label={t("chat.panel.close", "Close")}
					onClick={onClose}
				/>
			</div>
			{context && state !== "unavailable" && <ChatContextLine slot={context} />}
			<div className={styles.body}>
				{state === "loading" && <ConversationSkeleton />}
				{state === "unavailable" && (
					<div className={styles.center}>
						<EmptyState
							size="compact"
							icon={IconLock}
							title={t("chat.unavailable.title", "This chat isn't available")}
							description={t(
								"chat.unavailable.description",
								"It may have been closed, or you're no longer a member.",
							)}
							action={
								<Button onClick={onBack}>
									{t("chat.panel.back", "Back to messages")}
								</Button>
							}
						/>
					</div>
				)}
				{state === "ready" && children}
			</div>
			{state === "ready" && footer}
		</div>
	);
}

/** Replaces the composer once a chat is closed, or where only others post. */
export function ReadOnlyBanner({
	icon: Icon = IconLock,
	children,
}: {
	icon?: ComponentType<{ size?: number }>;
	children?: ReactNode;
}) {
	const { t } = useTranslate();
	return (
		<div className={styles.banner}>
			<Icon size={16} />
			{children ??
				t(
					"chat.readOnly.banner",
					"This chat is closed. You can read it, but not reply.",
				)}
		</div>
	);
}

/** Announcements for a member: no composer. Frame `wADvW`. */
export function AnnouncementsBanner() {
	const { t } = useTranslate();
	return (
		<ReadOnlyBanner icon={IconSpeakerphone}>
			{t("chat.announcements.readOnly", "Only GDHub admins post here")}
		</ReadOnlyBanner>
	);
}

/** Above an admin's composer in Announcements: whose name the post goes out under. Frame `JjXHO`. */
export function PostingAsGdhub() {
	const { t } = useTranslate();
	return (
		<div className={styles.postingAs}>
			<GdhubAvatar size={20} />
			{t("chat.announcements.postingAs", "Posting as GDHub")}
		</div>
	);
}

/** Announcements before the first post. */
export function EmptyAnnouncements() {
	const { t } = useTranslate();
	return (
		<div className={styles.center}>
			<EmptyState
				size="compact"
				icon={IconSpeakerphone}
				title={t("chat.announcements.empty.title", "No announcements yet")}
				description={t(
					"chat.announcements.empty.description",
					"News from the GDHub team will appear here.",
				)}
			/>
		</div>
	);
}

/** Replaces the timeline and the composer while an invite is pending. Frame `ZMcrW`. */
export function ChatInvite({
	name,
	avatarMxc,
	position,
	offerMessage,
	busy,
	onAccept,
	onDecline,
}: {
	name: string;
	avatarMxc?: string | null;
	position?: string | null;
	offerMessage?: string | null;
	busy?: "accept" | "decline" | null;
	onAccept: () => void;
	onDecline: () => void;
}) {
	const { t } = useTranslate();
	return (
		<div className={styles.invite}>
			<MatrixAvatar mxcUrl={avatarMxc} size={56}>
				{name.slice(0, 1).toUpperCase()}
			</MatrixAvatar>
			<p className={styles.inviteTitle}>
				{position
					? t(
							"chat.invite.title",
							"{name} invited you to talk about the {position} offer",
							{ name, position },
						)
					: t("chat.invite.titleDirect", "{name} invited you to a chat", {
							name,
						})}
			</p>
			<p className={styles.inviteDescription}>
				{t("chat.invite.description", "Accept to read the message and reply.")}
			</p>
			{offerMessage && (
				<blockquote className={styles.offer}>{offerMessage}</blockquote>
			)}
			<div className={styles.inviteActions}>
				<Button
					onClick={onDecline}
					loading={busy === "decline"}
					disabled={!!busy}
				>
					{t("chat.invite.decline", "Decline")}
				</Button>
				<Button
					type="primary"
					onClick={onAccept}
					loading={busy === "accept"}
					disabled={!!busy}
				>
					{t("chat.invite.accept", "Accept")}
				</Button>
			</div>
		</div>
	);
}

/** A conversation with no messages yet. Frame `u8M7E`. */
export function EmptyConversation({
	name,
	group = false,
}: {
	name: string;
	/** More than two people in the room: the privacy line names everyone. */
	group?: boolean;
}) {
	const { t } = useTranslate();
	return (
		<div className={styles.center}>
			<EmptyState
				size="compact"
				icon={IconMoodSmile}
				title={t("chat.emptyRoom.title", "Say hello to {name}", { name })}
				description={
					group
						? t(
								"chat.emptyRoom.groupDescription",
								"Only the people in this chat can see it.",
							)
						: t(
								"chat.emptyRoom.description",
								"Only the two of you can see this conversation.",
							)
				}
			/>
		</div>
	);
}
