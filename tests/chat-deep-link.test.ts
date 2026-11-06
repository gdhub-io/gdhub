import { describe, expect, it } from "vitest";
import { chatDeepLinkFromHash, roomIdFromHash } from "../src/lib/chat/deep-link";

const ROOM = "!DZYIUPmKlKhhJeIvAa:matrix.gdhub.io";

describe("chatDeepLinkFromHash", () => {
	it("opens the room a missed-message email points at", () => {
		expect(chatDeepLinkFromHash(`#/room/${ROOM}`)).toBe(
			`/hub?chat=1&roomId=${encodeURIComponent(ROOM)}`,
		);
	});

	it("ignores the event id Synapse appends for a single notification", () => {
		expect(
			chatDeepLinkFromHash(`#/room/${ROOM}/$J8gTP5278lxBz19j7_v9pQ`),
		).toBe(`/hub?chat=1&roomId=${encodeURIComponent(ROOM)}`);
	});

	it("survives a mail client that percent-encoded the room id", () => {
		expect(chatDeepLinkFromHash(`#/room/${encodeURIComponent(ROOM)}`)).toBe(
			`/hub?chat=1&roomId=${encodeURIComponent(ROOM)}`,
		);
	});

	it("falls back to the chat drawer when there is no room in the link", () => {
		expect(chatDeepLinkFromHash("")).toBe("/hub?chat=1");
		expect(chatDeepLinkFromHash("#/")).toBe("/hub?chat=1");
	});
});

describe("roomIdFromHash", () => {
	it("reads the room from an old /hub#/room/… email link", () => {
		expect(roomIdFromHash(`#/room/${ROOM}/$J8gTP5278lxBz19j7_v9pQ`)).toBe(ROOM);
	});

	it("leaves page anchors alone", () => {
		expect(roomIdFromHash("#faq")).toBeNull();
		expect(roomIdFromHash("")).toBeNull();
	});
});
