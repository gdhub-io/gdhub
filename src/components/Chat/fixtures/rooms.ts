import type { RoomSummary } from "../model/rooms";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const ago = (ms: number) => Date.now() - ms;

export const roomFixture = (patch: Partial<RoomSummary>): RoomSummary => ({
	roomId: "!room",
	name: "Room",
	avatarMxc: null,
	online: false,
	membership: "join",
	kind: "Direct",
	status: "Open",
	label: null,
	lastTs: ago(5 * MINUTE),
	preview: "See you tomorrow",
	previewIsOwn: false,
	previewDeleted: false,
	unread: 0,
	muted: false,
	...patch,
});

/** The pinned Announcements row, unread, as in 07.03. */
export const announcementsFixture = roomFixture({
	roomId: "!announcements",
	name: "Announcements",
	kind: "Announcements",
	preview: "November update — links, images and video in chat",
	unread: 1,
	lastTs: ago(2 * DAY),
});

/** A muted offer chat with an unread message: bell-off mark, grey count. */
export const mutedFixture = roomFixture({
	roomId: "!muted",
	name: "Lena Fischer",
	kind: "VacancyOffer",
	label: "Hollow Tide",
	preview: "I've attached my portfolio link, happy to share more",
	unread: 1,
	muted: true,
	lastTs: ago(2 * 60 * MINUTE),
});

/** A list with every row variant the design draws. */
export const roomsFixture: RoomSummary[] = [
	announcementsFixture,
	mutedFixture,
	roomFixture({
		roomId: "!advice",
		name: "Anna Volkova",
		kind: "AdviceRequest",
		label: "Hollow Tide",
		preview: "Try a single paid DLC first, then look at the season pass.",
		unread: 3,
		online: true,
		lastTs: ago(4 * MINUTE),
	}),
	roomFixture({
		roomId: "!offer",
		name: "Nebula Drift",
		kind: "VacancyOffer",
		label: "Unity Gameplay Programmer",
		preview: "Thanks, I've sent the test task back.",
		previewIsOwn: true,
		lastTs: ago(3 * 60 * MINUTE),
	}),
	roomFixture({
		roomId: "!invite",
		name: "Marty Spencer",
		membership: "invite",
		kind: "VacancyOffer",
		label: "Senior 2D Character Artist",
		preview: null,
		lastTs: ago(DAY),
	}),
	roomFixture({
		roomId: "!direct",
		name: "Jesus Mayer",
		preview: "The build is on itch now",
		lastTs: ago(3 * DAY),
	}),
	roomFixture({
		roomId: "!deleted",
		name: "Joel Kling",
		preview: "…",
		previewDeleted: true,
		lastTs: ago(20 * DAY),
	}),
	roomFixture({
		roomId: "!closed",
		name: "Wilfred Harvey",
		kind: "AdviceRequest",
		status: "Closed",
		label: "Project 1",
		preview: "Glad it helped — good luck with the launch!",
		lastTs: ago(40 * DAY),
	}),
];

/** Enough rows to page twice. */
export const manyRoomsFixture: RoomSummary[] = Array.from(
	{ length: 55 },
	(_, i) =>
		roomFixture({
			roomId: `!many-${i}`,
			name: `Teammate ${i + 1}`,
			preview: `Message number ${i + 1}`,
			lastTs: ago(i * 90 * MINUTE),
			unread: i % 7 === 0 ? i + 1 : 0,
		}),
);
