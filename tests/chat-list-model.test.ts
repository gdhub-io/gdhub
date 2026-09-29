import { describe, expect, it } from "vitest";
import {
	canCloseFromList,
	type RoomSummary,
	roomsForTab,
	unreadChatCount,
} from "@/components/Chat/model/rooms";
import { dayBucket } from "@/components/Chat/model/time";

const room = (patch: Partial<RoomSummary>): RoomSummary => ({
	roomId: "!r",
	name: "Room",
	membership: "join",
	kind: "Direct",
	status: "Open",
	label: null,
	lastTs: 0,
	preview: null,
	previewIsOwn: false,
	unread: 0,
	...patch,
});

describe("roomsForTab", () => {
	const rooms = [
		room({ roomId: "old", lastTs: 1 }),
		room({ roomId: "new", lastTs: 3, unread: 2 }),
		room({ roomId: "invite", lastTs: 2, membership: "invite" }),
		room({ roomId: "closed", lastTs: 4, status: "Closed", unread: 5 }),
	];
	const ids = (list: RoomSummary[]) => list.map((r) => r.roomId);

	it("keeps closed chats out of All and Unread, newest first", () => {
		expect(ids(roomsForTab(rooms, "all"))).toEqual(["new", "invite", "old"]);
		expect(ids(roomsForTab(rooms, "unread"))).toEqual(["new", "invite"]);
	});

	it("puts only closed chats in Closed, even unread ones", () => {
		expect(ids(roomsForTab(rooms, "closed"))).toEqual(["closed"]);
	});

	it("counts unread chats, not messages, and counts invites", () => {
		expect(unreadChatCount(rooms)).toBe(2);
	});

	it("does not reorder the caller's array", () => {
		roomsForTab(rooms, "all");
		expect(ids(rooms)).toEqual(["old", "new", "invite", "closed"]);
	});
});

describe("canCloseFromList", () => {
	it("offers Close only for open advice and vacancy chats the user joined", () => {
		expect(canCloseFromList(room({ kind: "AdviceRequest" }))).toBe(true);
		expect(canCloseFromList(room({ kind: "VacancyOffer" }))).toBe(true);
		expect(canCloseFromList(room({ kind: "Direct" }))).toBe(false);
		expect(
			canCloseFromList(room({ kind: "AdviceRequest", status: "Closed" })),
		).toBe(false);
		expect(
			canCloseFromList(room({ kind: "VacancyOffer", membership: "invite" })),
		).toBe(false);
	});
});

describe("dayBucket", () => {
	// Local-time constructors keep these independent of the runner's timezone.
	const now = new Date(2026, 8, 29, 0, 30);
	const at = (m: number, d: number, h = 12, y = 2026) =>
		new Date(y, m, d, h).getTime();

	it("splits today and yesterday at local midnight, not 24 hours", () => {
		expect(dayBucket(new Date(2026, 8, 29, 0, 5).getTime(), now)).toEqual({
			unit: "today",
		});
		expect(dayBucket(new Date(2026, 8, 28, 23, 55).getTime(), now)).toEqual({
			unit: "yesterday",
		});
	});

	it("names the weekday within six days, then a date", () => {
		expect(dayBucket(at(8, 23), now)).toEqual({ unit: "weekday" });
		expect(dayBucket(at(8, 22), now)).toEqual({
			unit: "date",
			withYear: false,
		});
	});

	it("adds the year only for another year", () => {
		expect(dayBucket(at(11, 31, 12, 2025), now)).toEqual({
			unit: "date",
			withYear: true,
		});
	});

	it("treats a timestamp slightly in the future as today", () => {
		expect(dayBucket(new Date(2026, 8, 29, 0, 31).getTime(), now)).toEqual({
			unit: "today",
		});
	});
});
