import dayjs from "dayjs";

export type DeliveryStatus = "sending" | "sent" | "read" | "failed";

export type TimelineMessage = {
	kind: "message";
	/** Event id, or the transaction id of a local echo. */
	id: string;
	senderId: string;
	senderName: string;
	avatarMxc: string | null;
	own: boolean;
	ts: number;
	text: string;
	edited: boolean;
	deleted: boolean;
	/** Own messages only. */
	status?: DeliveryStatus;
};

export type TimelineNotice = {
	kind: "notice";
	id: string;
	ts: number;
	text: string;
};

export type TimelineEntry = TimelineMessage | TimelineNotice;

export type TimelineItem =
	| { type: "day"; key: string; ts: number }
	| { type: "notice"; key: string; notice: TimelineNotice }
	| {
			type: "group";
			key: string;
			own: boolean;
			senderName: string;
			avatarMxc: string | null;
			ts: number;
			messages: TimelineMessage[];
	  };

/** Consecutive messages further apart than this start a new group. */
export const GROUP_GAP_MS = 5 * 60_000;

/**
 * Entries in timeline order → day separators, notices and sender groups. A
 * group is one sender, one calendar day, each message under five minutes after
 * the previous one.
 */
export function buildTimeline(entries: TimelineEntry[]): TimelineItem[] {
	const items: TimelineItem[] = [];
	let lastTs: number | null = null;
	let group: Extract<TimelineItem, { type: "group" }> | null = null;

	for (const entry of entries) {
		if (lastTs === null || !dayjs(entry.ts).isSame(lastTs, "day")) {
			items.push({ type: "day", key: `day-${entry.id}`, ts: entry.ts });
			group = null;
		}

		if (entry.kind === "notice") {
			items.push({ type: "notice", key: entry.id, notice: entry });
			group = null;
		} else {
			const previous = group?.messages[group.messages.length - 1];
			if (
				group &&
				previous &&
				group.messages[0].senderId === entry.senderId &&
				entry.ts - previous.ts < GROUP_GAP_MS
			) {
				group.messages.push(entry);
			} else {
				group = {
					type: "group",
					key: entry.id,
					own: entry.own,
					senderName: entry.senderName,
					avatarMxc: entry.avatarMxc,
					ts: entry.ts,
					messages: [entry],
				};
				items.push(group);
			}
		}
		lastTs = entry.ts;
	}
	return items;
}
