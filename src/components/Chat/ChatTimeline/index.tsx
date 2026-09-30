import { IconArrowDown } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Badge, Button, Divider, Spin, theme } from "antd";
import dayjs from "dayjs";
import {
	type ReactNode,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { MessageGroup } from "../MessageGroup";
import { dayBucket } from "../model/time";
import type { TimelineItem } from "../model/timeline";
import styles from "./style.module.scss";

const BOTTOM_SLACK = 48;
const TOP_TRIGGER = 120;

type ChatTimelineProps = {
	items: TimelineItem[];
	canLoadEarlier?: boolean;
	loadingEarlier?: boolean;
	onLoadEarlier?: () => void;
	onRetry?: (messageId: string) => void;
	/** Fires when the latest message comes into or leaves view. */
	onAtBottomChange?: (atBottom: boolean) => void;
	/** Shown when the room has no messages at all. */
	empty?: ReactNode;
};

function DayLabel({ ts }: { ts: number }) {
	const { t } = useTranslate();
	const bucket = dayBucket(ts);
	const label =
		bucket.unit === "today"
			? t("chat.timeline.today", "Today")
			: bucket.unit === "yesterday"
				? t("chat.timeline.yesterday", "Yesterday")
				: bucket.unit === "weekday"
					? dayjs(ts).format("dddd")
					: dayjs(ts).format(bucket.withYear ? "D MMM YYYY" : "D MMM");
	return (
		<Divider plain className={styles.day}>
			{label}
		</Divider>
	);
}

export function ChatTimeline({
	items,
	canLoadEarlier,
	loadingEarlier,
	onLoadEarlier,
	onRetry,
	onAtBottomChange,
	empty,
}: ChatTimelineProps) {
	const { t } = useTranslate();
	const { token } = theme.useToken();
	const scrollRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const atBottomRef = useRef(true);
	// Distance from the bottom saved when older history is requested, so the
	// first visible message stays put once it is prepended.
	const anchorRef = useRef<number | null>(null);
	const [farFromBottom, setFarFromBottom] = useState(false);
	const [seenTs, setSeenTs] = useState<number | null>(null);

	const messages = useMemo(
		() => items.flatMap((item) => (item.type === "group" ? item.messages : [])),
		[items],
	);
	const lastMessage = messages[messages.length - 1];
	const newCount =
		seenTs === null
			? 0
			: messages.filter((m) => !m.own && m.ts > seenTs).length;

	useLayoutEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		if (anchorRef.current !== null) {
			el.scrollTop = el.scrollHeight - anchorRef.current;
			anchorRef.current = null;
			return;
		}
		// Sending always scrolls; anything else only if already at the bottom.
		if (atBottomRef.current || lastMessage?.status === "sending") {
			el.scrollTop = el.scrollHeight;
		}
	}, [items, lastMessage?.status]);

	// Avatars, fonts and the panel's own entrance change the height after the
	// first paint; stay pinned to the latest message through all of it.
	useEffect(() => {
		const el = scrollRef.current;
		const content = contentRef.current;
		if (!el || !content) return;
		const observer = new ResizeObserver(() => {
			if (atBottomRef.current) el.scrollTop = el.scrollHeight;
		});
		observer.observe(content);
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		onAtBottomChange?.(atBottomRef.current);
	}, [onAtBottomChange]);

	// A window of joins and renames with no message in it: fetch further back
	// before deciding the room is empty.
	useEffect(() => {
		if (!lastMessage && canLoadEarlier && !loadingEarlier) onLoadEarlier?.();
	}, [lastMessage, canLoadEarlier, loadingEarlier, onLoadEarlier]);

	const handleScroll = () => {
		const el = scrollRef.current;
		if (!el) return;
		const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
		const atBottom = fromBottom < BOTTOM_SLACK;
		if (atBottom !== atBottomRef.current) {
			atBottomRef.current = atBottom;
			setSeenTs(atBottom ? null : (lastMessage?.ts ?? 0));
			onAtBottomChange?.(atBottom);
		}
		setFarFromBottom(fromBottom > el.clientHeight);

		if (
			el.scrollTop < TOP_TRIGGER &&
			canLoadEarlier &&
			!loadingEarlier &&
			onLoadEarlier
		) {
			anchorRef.current = el.scrollHeight - el.scrollTop;
			onLoadEarlier();
		}
	};

	const jumpToLatest = () =>
		scrollRef.current?.scrollTo({
			top: scrollRef.current.scrollHeight,
			behavior: "smooth",
		});

	if (!lastMessage && !canLoadEarlier && empty) return <>{empty}</>;

	return (
		<div className={styles.wrap}>
			<div ref={scrollRef} className={styles.scroll} onScroll={handleScroll}>
				<div ref={contentRef} className={styles.content}>
					{loadingEarlier && (
						<div className={styles.earlier}>
							<Spin size="small" />
							{t("chat.timeline.loadingEarlier", "Loading earlier messages…")}
						</div>
					)}
					{items.map((item) =>
						item.type === "day" ? (
							<DayLabel key={item.key} ts={item.ts} />
						) : item.type === "notice" ? (
							<div key={item.key} className={styles.notice}>
								{item.notice.text}
							</div>
						) : (
							<MessageGroup
								key={item.key}
								own={item.own}
								senderName={item.senderName}
								avatarMxc={item.avatarMxc}
								ts={item.ts}
								messages={item.messages}
								onRetry={onRetry}
							/>
						),
					)}
				</div>
			</div>
			{farFromBottom && (
				<Badge
					count={newCount}
					color={token.colorPrimary}
					className={styles.jump}
					offset={[-4, 4]}
				>
					<Button
						shape="circle"
						size="large"
						icon={<IconArrowDown size={20} />}
						aria-label={t("chat.timeline.jumpToLatest", "Jump to latest")}
						onClick={jumpToLatest}
					/>
				</Badge>
			)}
		</div>
	);
}
