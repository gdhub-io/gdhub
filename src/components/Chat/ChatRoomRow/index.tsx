import {
	IconArchive,
	IconDoorExit,
	IconDotsVertical,
	IconMailOpened,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Badge, Button, Dropdown, type MenuProps, Tag, theme } from "antd";
import { useState } from "react";
import { MatrixAvatar } from "../MatrixAvatar";
import { canCloseFromList, isUnread, type RoomSummary } from "../model/rooms";
import { listStamp } from "../model/stamp";
import styles from "./style.module.scss";

export type ChatRoomRowActions = {
	onSelect: (roomId: string) => void;
	onMarkRead: (roomId: string) => void;
	onCloseChat: (roomId: string) => void;
	onLeave: (roomId: string) => void;
};

type ChatRoomRowProps = ChatRoomRowActions & { room: RoomSummary };

/**
 * One chat in the list — frame `Jtbe5` in platform-design.pen (Chat ·
 * components). Hand-rolled because the meta column swaps for the menu trigger
 * on hover, which antd's `List.Item` has no slot for.
 */
export function ChatRoomRow({
	room,
	onSelect,
	onMarkRead,
	onCloseChat,
	onLeave,
}: ChatRoomRowProps) {
	const { t } = useTranslate();
	const { token } = theme.useToken();
	const [menuOpen, setMenuOpen] = useState(false);
	const unread = isUnread(room);

	const kindLabel =
		room.kind === "AdviceRequest"
			? t("chat.kind.advice", "Advice")
			: room.kind === "VacancyOffer"
				? t("chat.kind.offer", "Offer")
				: null;

	const items: MenuProps["items"] = [
		unread && {
			key: "read",
			icon: <IconMailOpened size={16} />,
			label: t("chat.row.markRead", "Mark as read"),
			onClick: () => onMarkRead(room.roomId),
		},
		canCloseFromList(room) && {
			key: "close",
			icon: <IconArchive size={16} />,
			label: t("chat.row.close", "Close chat…"),
			onClick: () => onCloseChat(room.roomId),
		},
		room.kind === "Direct" &&
			room.membership === "join" && {
				key: "leave",
				icon: <IconDoorExit size={16} />,
				label: t("chat.row.leave", "Leave chat"),
				danger: true,
				onClick: () => onLeave(room.roomId),
			},
	].filter((item) => !!item);

	const preview = room.previewDeleted
		? t("chat.message.deleted", "Message deleted")
		: room.preview;

	return (
		<div
			className={styles.row}
			data-unread={unread || undefined}
			data-menu-open={menuOpen || undefined}
		>
			<button
				type="button"
				className={styles.main}
				onClick={() => onSelect(room.roomId)}
			>
				<span className={styles.avatar}>
					<MatrixAvatar mxcUrl={room.avatarMxc} size={40}>
						{room.name.slice(0, 1).toUpperCase()}
					</MatrixAvatar>
					{room.online && <span className={styles.online} />}
				</span>
				<span className={styles.body}>
					<span className={styles.titleLine}>
						<span className={styles.name}>{room.name}</span>
						{kindLabel && <Tag className={styles.kind}>{kindLabel}</Tag>}
						{room.label && <span className={styles.label}>{room.label}</span>}
					</span>
					<span
						className={styles.preview}
						data-deleted={room.previewDeleted || undefined}
					>
						{room.membership === "invite"
							? t("chat.presence.invitation", "Invitation")
							: preview && room.previewIsOwn
								? t("chat.row.you", "You: {text}", { text: preview })
								: preview}
					</span>
				</span>
				<span className={styles.meta}>
					{room.lastTs > 0 && (
						<span className={styles.time}>{listStamp(room.lastTs, t)}</span>
					)}
					{room.unread > 0 && (
						<Badge
							count={room.unread}
							overflowCount={99}
							color={token.colorPrimary}
							className={styles.count}
						/>
					)}
				</span>
			</button>
			{items.length > 0 && (
				<Dropdown
					menu={{ items }}
					trigger={["click"]}
					placement="bottomRight"
					onOpenChange={setMenuOpen}
				>
					<Button
						type="text"
						className={styles.trigger}
						icon={<IconDotsVertical size={20} />}
						aria-label={t("chat.row.menu", "More actions")}
					/>
				</Dropdown>
			)}
		</div>
	);
}
