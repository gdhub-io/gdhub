import {
	IconAlertCircle,
	IconCheck,
	IconChecks,
	IconClock,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import dayjs from "dayjs";
import { MatrixAvatar } from "../MatrixAvatar";
import type { DeliveryStatus, TimelineMessage } from "../model/timeline";
import styles from "./style.module.scss";

type MessageGroupProps = {
	own: boolean;
	senderName: string;
	avatarMxc: string | null;
	ts: number;
	messages: TimelineMessage[];
	onRetry?: (messageId: string) => void;
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
						className={styles.retry}
						onClick={() => onRetry(message.id)}
					>
						{t("chat.status.retry", "Retry")}
					</button>
				</>
			)}
		</div>
	);
}

/**
 * One sender's run of messages — frames `YGPUq` / `X7HUy`. Hand-rolled rather
 * than a library bubble: the hover block of stage 7 has to take over the
 * bubble's fill, which the library bubble does not let go of.
 */
export function MessageGroup({
	own,
	senderName,
	avatarMxc,
	ts,
	messages,
	onRetry,
}: MessageGroupProps) {
	const { t } = useTranslate();
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
					<div key={message.id} className={styles.message}>
						<div
							className={styles.bubble}
							data-deleted={message.deleted || undefined}
						>
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
						{/* A failed send surfaces where it happened, not only at the end. */}
						{own && message.status === "failed" && message !== last && (
							<Delivery message={message} onRetry={onRetry} />
						)}
					</div>
				))}
				{own && (
					<div className={styles.ownFoot}>
						<span className={styles.time}>
							{dayjs(last.ts).format("HH:mm")}
						</span>
						<Delivery message={last} onRetry={onRetry} />
					</div>
				)}
			</div>
		</div>
	);
}
