import { describe, expect, it } from "vitest";
import {
	buildTimeline,
	type TimelineEntry,
	type TimelineMessage,
} from "@/components/Chat/model/timeline";

const at = (d: number, h: number, m = 0) =>
	new Date(2026, 8, d, h, m).getTime();

const message = (
	id: string,
	senderId: string,
	ts: number,
): TimelineMessage => ({
	kind: "message",
	id,
	senderId,
	senderName: senderId,
	avatarMxc: null,
	own: senderId === "me",
	ts,
	text: id,
	edited: false,
	deleted: false,
});

const shape = (entries: TimelineEntry[]) =>
	buildTimeline(entries).map((item) =>
		item.type === "group"
			? item.messages.map((m) => m.id).join("+")
			: item.type === "notice"
				? `notice:${item.notice.id}`
				: "day",
	);

describe("buildTimeline", () => {
	it("groups one sender's messages under five minutes apart", () => {
		expect(
			shape([
				message("a", "anna", at(29, 10, 0)),
				message("b", "anna", at(29, 10, 4)),
				message("c", "anna", at(29, 10, 9)),
			]),
		).toEqual(["day", "a+b", "c"]);
	});

	it("starts a new group when the sender changes", () => {
		expect(
			shape([
				message("a", "anna", at(29, 10, 0)),
				message("b", "me", at(29, 10, 1)),
				message("c", "anna", at(29, 10, 2)),
			]),
		).toEqual(["day", "a", "b", "c"]);
	});

	it("puts a separator at local midnight, splitting a group", () => {
		expect(
			shape([
				message("a", "anna", new Date(2026, 8, 28, 23, 58).getTime()),
				message("b", "anna", new Date(2026, 8, 29, 0, 1).getTime()),
			]),
		).toEqual(["day", "a", "day", "b"]);
	});

	it("lets a notice break the group around it", () => {
		expect(
			shape([
				message("a", "anna", at(29, 10, 0)),
				{ kind: "notice", id: "n", ts: at(29, 10, 1), text: "joined" },
				message("b", "anna", at(29, 10, 2)),
			]),
		).toEqual(["day", "a", "notice:n", "b"]);
	});

	it("returns nothing for an empty room", () => {
		expect(buildTimeline([])).toEqual([]);
	});
});
