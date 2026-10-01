import { useTranslate } from "@tolgee/react";
import { App } from "antd";
import {
	EventStatus,
	EventTimeline,
	EventType,
	type MatrixClient,
	type MatrixEvent,
	type Room,
	RoomEvent,
} from "matrix-js-sdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyConversation } from "../ChatConversation";
import { markRoomRead } from "../matrix";
import {
	buildTimeline,
	type DeliveryStatus,
	type Reaction,
	type ReplyQuote,
	stripReplyFallback,
	type TimelineEntry,
	type TimelineMessage,
} from "../model/timeline";
import { useChat } from "../useChat";
import { ChatTimeline } from "./index";

type Translate = ReturnType<typeof useTranslate>["t"];

const ROOM_EVENTS = [
	RoomEvent.Timeline,
	RoomEvent.Receipt,
	RoomEvent.Redaction,
	RoomEvent.LocalEchoUpdated,
] as const;

function deliveryOf(
	event: MatrixEvent,
	index: number,
	readUpTo: number,
): DeliveryStatus {
	const status = event.getAssociatedStatus();
	if (status === EventStatus.NOT_SENT) return "failed";
	if (
		status === EventStatus.SENDING ||
		status === EventStatus.QUEUED ||
		status === EventStatus.ENCRYPTING
	) {
		return "sending";
	}
	return index <= readUpTo ? "read" : "sent";
}

function noticeText(event: MatrixEvent, room: Room, t: Translate) {
	const content = event.getContent();
	const name =
		content.displayname ||
		room.getMember(event.getStateKey() ?? "")?.name ||
		t("chat.system.someone", "Someone");
	const previous = event.getPrevContent().membership;
	switch (content.membership) {
		case "join":
			return previous === "join"
				? null
				: t("chat.system.joined", "{name} joined", { name });
		case "leave":
			return t("chat.system.left", "{name} left", { name });
		case "invite":
			return t("chat.system.invited", "{name} was invited", { name });
		default:
			return null;
	}
}

function reactionsOf(
	room: Room,
	eventId: string,
	myId: string | null,
): Reaction[] | undefined {
	const annotations = room.relations
		.getChildEventsForEvent(eventId, "m.annotation", EventType.Reaction)
		?.getSortedAnnotationsByKey();
	if (!annotations?.length) return undefined;
	// A taken-back reaction stays in the aggregation as a redacted event.
	return annotations.flatMap(([key, events]) => {
		const live = [...events].filter((event) => !event.isRedacted());
		if (live.length === 0) return [];
		return {
			key,
			count: live.length,
			mineEventId:
				live.find((event) => event.getSender() === myId)?.getId() ?? null,
			senderNames: live.map(
				(event) =>
					room.getMember(event.getSender() ?? "")?.name ??
					event.getSender() ??
					"",
			),
		};
	});
}

function replyOf(room: Room, event: MatrixEvent): ReplyQuote | undefined {
	const id = event.replyEventId;
	if (!id) return undefined;
	const original = room.findEventById(id);
	const sender = original?.getSender() ?? "";
	return {
		id,
		senderName: room.getMember(sender)?.name ?? sender,
		text: original
			? stripReplyFallback(String(original.getContent().body ?? ""))
			: null,
		deleted: !!original?.isRedacted(),
	};
}

/** Timeline entries from the live timeline, oldest first. */
function entriesOf(
	room: Room,
	client: MatrixClient,
	t: Translate,
): TimelineEntry[] {
	const myId = client.getUserId();
	const events = room.getLiveTimeline().getEvents();
	const indexOf = new Map(events.map((event, i) => [event.getId(), i]));
	// The furthest point anyone else has read to: every own message at or
	// before it is "read". One pass instead of a receipt lookup per message.
	const readUpTo = Math.max(
		-1,
		...room
			.getJoinedMembers()
			.filter((member) => member.userId !== myId)
			.map(
				(member) =>
					indexOf.get(room.getEventReadUpTo(member.userId) ?? "") ?? -1,
			),
	);

	const entries: TimelineEntry[] = [];
	events.forEach((event, index) => {
		const id = event.getId() || event.getTxnId() || `${event.getTs()}`;
		if (event.getType() === EventType.RoomMember) {
			const text = noticeText(event, room, t);
			if (text) entries.push({ kind: "notice", id, ts: event.getTs(), text });
			return;
		}
		if (event.getType() !== EventType.RoomMessage) return;
		if (event.isRelation("m.replace")) return;

		const senderId = event.getSender() ?? "";
		const member = room.getMember(senderId);
		const own = senderId === myId;
		entries.push({
			kind: "message",
			id,
			senderId,
			senderName: member?.name || senderId,
			avatarMxc: member?.getMxcAvatarUrl() ?? null,
			own,
			ts: event.getTs(),
			text: event.replyEventId
				? stripReplyFallback(String(event.getContent().body ?? ""))
				: String(event.getContent().body ?? ""),
			edited: !!event.replacingEventId(),
			deleted: event.isRedacted(),
			status: own ? deliveryOf(event, index, readUpTo) : undefined,
			replyTo: replyOf(room, event),
			reactions: event.getId()
				? reactionsOf(room, event.getId() as string, myId)
				: undefined,
		});
	});
	return entries;
}

/** `ChatTimeline` for one Matrix room: history paging, retry, read marking. */
export function ConnectedTimeline({
	room,
	name,
	readOnly,
}: {
	room: Room;
	name: string;
	readOnly?: boolean;
}) {
	const { t } = useTranslate();
	const { modal, message } = App.useApp();
	const chatClient = useChat((s) => s.chatClient);
	const panelOpen = useChat((s) => s.openChatModal);
	const [version, setVersion] = useState(0);
	const [loadingEarlier, setLoadingEarlier] = useState(false);
	const atBottomRef = useRef(true);

	useEffect(() => {
		if (!chatClient) return;
		const bump = (_event: unknown, eventRoom?: Room) => {
			if (!eventRoom || eventRoom.roomId === room.roomId) {
				setVersion((v) => v + 1);
			}
		};
		const listener = bump as never;
		for (const event of ROOM_EVENTS) chatClient.on(event as never, listener);
		return () => {
			for (const event of ROOM_EVENTS) {
				chatClient.removeListener(event as never, listener);
			}
		};
	}, [chatClient, room.roomId]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `version` is the Matrix change signal
	const items = useMemo(
		() => (chatClient ? buildTimeline(entriesOf(room, chatClient, t)) : []),
		[chatClient, room, t, version],
	);

	const timeline = room.getLiveTimeline();
	const canLoadEarlier =
		!!timeline.getPaginationToken(EventTimeline.BACKWARDS) ||
		!!timeline.getNeighbouringTimeline(EventTimeline.BACKWARDS);

	const loadEarlier = async () => {
		if (!chatClient) return;
		setLoadingEarlier(true);
		try {
			await chatClient.paginateEventTimeline(timeline, {
				backwards: true,
				limit: 30,
			});
		} finally {
			setLoadingEarlier(false);
			setVersion((v) => v + 1);
		}
	};

	// Read only what is on screen: at the bottom, panel open, tab visible.
	const markIfVisible = useCallback(() => {
		if (!chatClient || !panelOpen || !atBottomRef.current) return;
		if (document.visibilityState !== "visible") return;
		markRoomRead(chatClient, room.roomId);
	}, [chatClient, panelOpen, room.roomId]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: re-check on every timeline change
	useEffect(markIfVisible, [markIfVisible, version]);

	useEffect(() => {
		document.addEventListener("visibilitychange", markIfVisible);
		return () =>
			document.removeEventListener("visibilitychange", markIfVisible);
	}, [markIfVisible]);

	const onAtBottomChange = useCallback(
		(atBottom: boolean) => {
			atBottomRef.current = atBottom;
			if (atBottom) markIfVisible();
		},
		[markIfVisible],
	);

	const eventOf = (messageId: string) =>
		timeline
			.getEvents()
			.find((e) => e.getId() === messageId || e.getTxnId() === messageId);

	const failed = () =>
		message.error(
			t("chat.message.actionFailed", "Couldn't update the message"),
		);

	const actions = {
		onRetry: (messageId: string) => {
			const event = eventOf(messageId);
			if (event && chatClient) chatClient.resendEvent(event, room);
		},
		// Toggle: a second tap on the same emoji takes the reaction back.
		onReact: (target: TimelineMessage, key: string) => {
			if (!chatClient) return;
			const mine = target.reactions?.find((r) => r.key === key)?.mineEventId;
			const request = mine
				? chatClient.redactEvent(room.roomId, mine)
				: chatClient.sendEvent(room.roomId, EventType.Reaction, {
						"m.relates_to": {
							rel_type: "m.annotation",
							event_id: target.id,
							key,
						},
					} as never);
			request.catch(failed);
		},
		onReply: (target: TimelineMessage) =>
			useChat.getState().setMode(room.roomId, {
				type: "reply",
				eventId: target.id,
				senderName: target.senderName,
				preview: target.text,
			}),
		onEdit: (target: TimelineMessage) =>
			useChat.getState().setMode(room.roomId, {
				type: "edit",
				eventId: target.id,
				original: target.text,
			}),
		onCopy: (target: TimelineMessage) =>
			navigator.clipboard
				.writeText(target.text)
				.then(() => message.success(t("chat.message.copied", "Copied")))
				.catch(failed),
		onDelete: (target: TimelineMessage) =>
			modal.confirm({
				title: t("chat.deleteConfirm.title", "Delete this message?"),
				content: t(
					"chat.deleteConfirm.content",
					"It will be removed for everyone in the chat. This can't be undone.",
				),
				okText: t("chat.deleteConfirm.ok", "Delete"),
				okButtonProps: { danger: true },
				cancelText: t("chat.composer.cancel", "Cancel"),
				onOk: () =>
					chatClient?.redactEvent(room.roomId, target.id).catch(failed),
			}),
	};

	return (
		<ChatTimeline
			items={items}
			canLoadEarlier={canLoadEarlier}
			loadingEarlier={loadingEarlier}
			onLoadEarlier={loadEarlier}
			actions={actions}
			readOnly={readOnly}
			onAtBottomChange={onAtBottomChange}
			empty={<EmptyConversation name={name} />}
		/>
	);
}
