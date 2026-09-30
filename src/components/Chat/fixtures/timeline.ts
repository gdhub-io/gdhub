import type { TimelineEntry, TimelineMessage } from "../model/timeline";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const now = Date.now();

export const messageFixture = (
	patch: Partial<TimelineMessage>,
): TimelineMessage => ({
	kind: "message",
	id: `m-${Math.random().toString(36).slice(2)}`,
	senderId: "anna",
	senderName: "Anna Volkova",
	avatarMxc: null,
	own: false,
	ts: now - 5 * MINUTE,
	text: "Hi!",
	edited: false,
	deleted: false,
	...patch,
});

const mine = (patch: Partial<TimelineMessage>) =>
	messageFixture({
		senderId: "me",
		senderName: "Me",
		own: true,
		status: "read",
		...patch,
	});

/** Two days of an advice chat: groups, a notice, every delivery state. */
export const conversationFixture: TimelineEntry[] = [
	{
		kind: "notice",
		id: "n1",
		ts: now - DAY - 60 * MINUTE,
		text: "Anna Volkova joined",
	},
	messageFixture({
		id: "a1",
		ts: now - DAY - 58 * MINUTE,
		text: "Hi! I read your question about the DLC pricing.",
	}),
	messageFixture({
		id: "a2",
		ts: now - DAY - 57 * MINUTE,
		text: "Short answer: one paid DLC first, then look at a season pass once you know the attach rate.",
	}),
	mine({
		id: "b1",
		ts: now - DAY - 40 * MINUTE,
		text: "That matches what our publisher's data says, thanks.",
		edited: true,
	}),
	messageFixture({
		id: "a3",
		ts: now - 30 * MINUTE,
		text: "How did the store page test go?",
	}),
	mine({ id: "b2", ts: now - 12 * MINUTE, text: "Wishlists doubled 🎉" }),
	mine({
		id: "b3",
		ts: now - 11 * MINUTE,
		text: "Posting the numbers in a sec",
		status: "sent",
	}),
	messageFixture({ id: "a4", ts: now - 6 * MINUTE, text: "…", deleted: true }),
	mine({
		id: "b4",
		ts: now - 2 * MINUTE,
		text: "Here they are",
		status: "failed",
	}),
	mine({
		id: "b5",
		ts: now - MINUTE,
		text: "And the chart",
		status: "sending",
	}),
];
