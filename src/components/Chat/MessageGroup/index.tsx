import {
	IconAlertCircle,
	IconArrowBackUp,
	IconCheck,
	IconChecks,
	IconClock,
	IconCopy,
	IconCornerDownRight,
	IconDotsVertical,
	IconPencil,
	IconTrash,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Dropdown, type MenuProps, Tooltip } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { MatrixAvatar } from "../MatrixAvatar";
import type { DeliveryStatus, TimelineMessage } from "../model/timeline";
import styles from "./style.module.scss";

export const QUICK_REACTIONS = ["👍", "👎", "❤️", "🔥", "😂", "😮", "😢"];

export type MessageActions = {
	onReact?: (message: TimelineMessage, key: string) => void;
	onReply?: (message: TimelineMessage) => void;
	onCopy?: (message: TimelineMessage) => void;
	onEdit?: (message: TimelineMessage) => void;
	onDelete?: (message: TimelineMessage) => void;
	onJumpTo?: (messageId: string) => void;
	onRetry?: (messageId: string) => void;
};

type MessageGroupProps = MessageActions & {
	own: boolean;
	senderName: string;
	avatarMxc: string | null;
	ts: number;
	messages: TimelineMessage[];
	/** A closed chat: Copy only, reactions shown but not togglable. */
	readOnly?: boolean;
};

const STATUS_ICON: Record<DeliveryStatus, typeof IconCheck> = {
	sending: IconClock,
	sent: IconCheck,
	read: IconChecks,
	failed: IconAlertCircle,
};

function Delivery({
	message,
	onRetry,
}: {
	message: TimelineMessage;
	onRetry?: (messageId: string) => void;
}) {
	const { t } = useTranslate();
	if (!message.status) return null;
	const Icon = STATUS_ICON[message.status];
	const label = {
		sending: t("chat.status.sending", "Sending…"),
		sent: t("chat.status.sent", "Sent"),
		read: t("chat.status.read", "Read"),
		failed: t("chat.status.failed", "Not sent"),
	}[message.status];

	return (
		<div className={styles.delivery} data-status={message.status}>
			<Icon size={14} />
			<span>{label}</span>
			{message.status === "failed" && onRetry && (
				<>
					<span>·</span>
					<button
						type="button"
						className={styles.linkButton}
						onClick={() => onRetry(message.id)}
					>
						{t("chat.status.retry", "Retry")}
					</button>
				</>
			)}
		</div>
	);
}

/** One message: the bubble, its hover block and its menu — sheet `hPrUv`. */
function Message({
	message,
	own,
	readOnly,
	...actions
}: MessageActions & {
	message: TimelineMessage;
	own: boolean;
	readOnly?: boolean;
}) {
	const { t } = useTranslate();
	const [open, setOpen] = useState(false);
	const live = !message.deleted && message.status !== "sending";
	const canReact = live && !readOnly && !!actions.onReact;
	const mine = own && live && !readOnly;

	const items: MenuProps["items"] = [
		!readOnly &&
			live && {
				key: "reply",
				icon: <IconArrowBackUp size={16} />,
				label: t("chat.message.reply", "Reply"),
				onClick: () => actions.onReply?.(message),
			},
		!message.deleted && {
			key: "copy",
			icon: <IconCopy size={16} />,
			label: t("chat.message.copy", "Copy"),
			onClick: () => actions.onCopy?.(message),
		},
		mine && {
			key: "edit",
			icon: <IconPencil size={16} />,
			label: t("chat.message.edit", "Edit"),
			onClick: () => actions.onEdit?.(message),
		},
		mine && { type: "divider" as const },
		mine && {
			key: "delete",
			icon: <IconTrash size={16} />,
			label: t("chat.message.delete", "Delete"),
			danger: true,
			onClick: () => actions.onDelete?.(message),
		},
	].filter((item) => !!item);

	const trigger = (
		<span className={styles.triggerSlot}>
			{items.length > 0 && (
				<Dropdown
					open={open}
					onOpenChange={setOpen}
					trigger={["click", "contextMenu"]}
					placement={own ? "bottomLeft" : "bottomRight"}
					menu={{ items }}
					popupRender={(menu) => (
						<div className={styles.menuStack}>
							{canReact && (
								<div className={styles.strip}>
									{QUICK_REACTIONS.map((key) => (
										<button
											key={key}
											type="button"
											className={styles.stripEmoji}
											aria-label={t(
												"chat.message.react",
												"React with {emoji}",
												{
													emoji: key,
												},
											)}
											onClick={() => {
												actions.onReact?.(message, key);
												setOpen(false);
											}}
										>
											{key}
										</button>
									))}
								</div>
							)}
							{menu}
						</div>
					)}
				>
					<Button
						type="text"
						size="small"
						className={styles.trigger}
						icon={<IconDotsVertical size={16} />}
						aria-label={t("chat.message.menu", "Message actions")}
					/>
				</Dropdown>
			)}
		</span>
	);

	return (
		<div className={styles.message} data-message-id={message.id}>
			<div className={styles.block} data-open={open || undefined}>
				{own && trigger}
				<div
					className={styles.bubble}
					data-deleted={message.deleted || undefined}
				>
					{message.replyTo && (
						<button
							type="button"
							className={styles.quoteRow}
							aria-label={t("chat.message.replyTo", "Reply to {name}", {
								name: message.replyTo.senderName,
							})}
							onClick={() => actions.onJumpTo?.(message.replyTo?.id ?? "")}
						>
							<IconCornerDownRight size={14} className={styles.quoteIcon} />
							<span className={styles.quote}>
								<span className={styles.quoteName}>
									{message.replyTo.senderName}
								</span>
								<span
									className={styles.quoteText}
									data-deleted={message.replyTo.deleted || undefined}
								>
									{message.replyTo.deleted
										? t("chat.message.deleted", "Message deleted")
										: (message.replyTo.text ?? "…")}
								</span>
							</span>
						</button>
					)}
					{message.deleted
						? t("chat.message.deleted", "Message deleted")
						: message.text}
					{message.edited && !message.deleted && (
						<span className={styles.edited}>
							{" · "}
							{t("chat.message.edited", "edited")}
						</span>
					)}
				</div>
				{!own && trigger}
			</div>
			{!message.deleted &&
				message.reactions &&
				message.reactions.length > 0 && (
					<div className={styles.reactions}>
						{message.reactions.map((reaction) => (
							<Tooltip
								key={reaction.key}
								title={t(
									"chat.message.reactedBy",
									"{names} reacted with {emoji}",
									{
										names: reaction.senderNames.join(", "),
										emoji: reaction.key,
									},
								)}
							>
								<button
									type="button"
									className={styles.chip}
									data-mine={!!reaction.mineEventId || undefined}
									aria-pressed={!!reaction.mineEventId}
									disabled={!canReact}
									onClick={() => actions.onReact?.(message, reaction.key)}
								>
									<span>{reaction.key}</span>
									<span className={styles.chipCount}>{reaction.count}</span>
								</button>
							</Tooltip>
						))}
					</div>
				)}
		</div>
	);
}

/**
 * One sender's run of messages — frames `YGPUq` / `X7HUy`. Hand-rolled rather
 * than a library bubble: on hover the block takes over the bubble's fill, which
 * a library bubble does not let go of.
 */
export function MessageGroup({
	own,
	senderName,
	avatarMxc,
	ts,
	messages,
	readOnly,
	...actions
}: MessageGroupProps) {
	const last = messages[messages.length - 1];

	return (
		<div className={styles.group} data-own={own || undefined}>
			{!own && (
				<MatrixAvatar mxcUrl={avatarMxc} size={32} className={styles.avatar}>
					{senderName.slice(0, 1).toUpperCase()}
				</MatrixAvatar>
			)}
			<div className={styles.column}>
				{!own && (
					<div className={styles.head}>
						<span className={styles.name}>{senderName}</span>
						<span className={styles.time}>{dayjs(ts).format("HH:mm")}</span>
					</div>
				)}
				{messages.map((message) => (
					<div key={message.id} className={styles.item}>
						<Message
							message={message}
							own={own}
							readOnly={readOnly}
							{...actions}
						/>
						{/* A failed send surfaces where it happened, not only at the end. */}
						{own && message.status === "failed" && message !== last && (
							<Delivery message={message} onRetry={actions.onRetry} />
						)}
					</div>
				))}
				{own && (
					<div className={styles.ownFoot}>
						<span className={styles.time}>
							{dayjs(last.ts).format("HH:mm")}
						</span>
						<Delivery message={last} onRetry={actions.onRetry} />
					</div>
				)}
			</div>
		</div>
	);
}
