import {
	IconArchive,
	IconChecks,
	IconMessageCircle,
	IconPlugConnectedX,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Skeleton, Tabs } from "antd";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/ui";
import { ChatRoomRow, type ChatRoomRowActions } from "../ChatRoomRow";
import {
	type ChatTab,
	type RoomSummary,
	roomsForTab,
	unreadChatCount,
} from "../model/rooms";
import styles from "./style.module.scss";

const PAGE = 20;

type ChatRoomListProps = ChatRoomRowActions & {
	/** `null` while the first sync is still running. */
	rooms: RoomSummary[] | null;
	error?: boolean;
	onRetry?: () => void;
	tab: ChatTab;
	onTabChange: (tab: ChatTab) => void;
};

function SkeletonRows() {
	return (
		<div className={styles.skeleton}>
			{Array.from({ length: 9 }, (_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
				<div key={i} className={styles.skeletonRow}>
					<Skeleton.Avatar active size={40} />
					<div className={styles.skeletonText}>
						<Skeleton.Input active size="small" block />
						<Skeleton.Input active size="small" block />
					</div>
				</div>
			))}
		</div>
	);
}

/** Renders a page of rows and appends the next one as the end scrolls into view. */
function RoomPane({
	rooms,
	empty,
	actions,
}: {
	rooms: RoomSummary[];
	empty: React.ReactNode;
	actions: ChatRoomRowActions;
}) {
	const [visible, setVisible] = useState(PAGE);
	const paneRef = useRef<HTMLDivElement>(null);
	const sentinelRef = useRef<HTMLDivElement>(null);
	const hasMore = visible < rooms.length;

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!hasMore || !sentinel) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) setVisible((count) => count + PAGE);
			},
			{ root: paneRef.current, rootMargin: "200px" },
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [hasMore]);

	if (rooms.length === 0) return <div className={styles.center}>{empty}</div>;

	return (
		<div ref={paneRef} className={styles.pane}>
			{rooms.slice(0, visible).map((room) => (
				<ChatRoomRow key={room.roomId} room={room} {...actions} />
			))}
			{hasMore && <div ref={sentinelRef} className={styles.sentinel} />}
		</div>
	);
}

export function ChatRoomList({
	rooms,
	error,
	onRetry,
	tab,
	onTabChange,
	...actions
}: ChatRoomListProps) {
	const { t } = useTranslate();
	const byTab = useMemo(
		() =>
			rooms && {
				all: roomsForTab(rooms, "all"),
				unread: roomsForTab(rooms, "unread"),
				closed: roomsForTab(rooms, "closed"),
			},
		[rooms],
	);

	if (error) {
		return (
			<div className={styles.center}>
				<EmptyState
					icon={IconPlugConnectedX}
					title={t("chat.error.title", "Chat is unreachable")}
					description={t(
						"chat.error.description",
						"We couldn't connect to the message server.",
					)}
					action={
						onRetry && (
							<Button onClick={onRetry}>
								{t("chat.error.retry", "Try again")}
							</Button>
						)
					}
				/>
			</div>
		);
	}

	const unread = rooms ? unreadChatCount(rooms) : 0;
	const tabs: {
		key: ChatTab;
		label: React.ReactNode;
		empty: React.ReactNode;
	}[] = [
		{
			key: "all",
			label: t("chat.tabs.all", "All"),
			empty: (
				<EmptyState
					icon={IconMessageCircle}
					title={t("chat.empty.all.title", "No conversations yet")}
					description={t(
						"chat.empty.all.description",
						"Chats with experts and project teams appear here once one of you writes.",
					)}
					action={
						<Link href="/hub/experts">
							<Button type="primary">
								{t("chat.empty.all.action", "Find an expert")}
							</Button>
						</Link>
					}
				/>
			),
		},
		{
			key: "unread",
			label: (
				<span className={styles.tabLabel}>
					{t("chat.tabs.unread", "Unread")}
					{unread > 0 && <span className={styles.tabCount}>{unread}</span>}
				</span>
			),
			empty: (
				<EmptyState
					icon={IconChecks}
					title={t("chat.empty.unread.title", "You're all caught up")}
					description={t(
						"chat.empty.unread.description",
						"Chats with new messages show up here.",
					)}
				/>
			),
		},
		{
			key: "closed",
			label: t("chat.tabs.closed", "Closed"),
			empty: (
				<EmptyState
					icon={IconArchive}
					title={t("chat.empty.closed.title", "No closed chats")}
					description={t(
						"chat.empty.closed.description",
						"Resolved questions and closed offers land here. They stay readable.",
					)}
				/>
			),
		},
	];

	// Tabs draws only the bar. The panes are ours and all stay mounted, so each
	// one keeps its own scroll position.
	return (
		<>
			<Tabs
				className={styles.tabs}
				activeKey={tab}
				onChange={(key) => onTabChange(key as ChatTab)}
				items={tabs.map(({ key, label }) => ({ key, label }))}
			/>
			{tabs.map(({ key, empty }) => (
				<div key={key} className={key === tab ? styles.panel : styles.hidden}>
					{byTab ? (
						<RoomPane rooms={byTab[key]} empty={empty} actions={actions} />
					) : (
						<SkeletonRows />
					)}
				</div>
			))}
		</>
	);
}
