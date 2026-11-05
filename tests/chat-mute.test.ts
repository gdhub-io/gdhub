import type { IPushRules } from "matrix-js-sdk";
import { describe, expect, it } from "vitest";
import {
	canPostAnnouncements,
	isGdhubUserId,
} from "@/components/Chat/model/announcements";
import {
	isRoomMuted,
	mutedRoomIds,
	muteRuleBody,
} from "@/components/Chat/model/mute";

const override = (roomId: string, patch: Record<string, unknown> = {}) => ({
	rule_id: roomId,
	default: false,
	enabled: true,
	...muteRuleBody(roomId),
	...patch,
});

const rules = (global: Record<string, unknown[]>) =>
	({ global }) as unknown as IPushRules;

describe("mutedRoomIds", () => {
	it("reads a room-id override with no notify action as muted", () => {
		expect(isRoomMuted(rules({ override: [override("!a")] }), "!a")).toBe(
			true,
		);
		expect(isRoomMuted(rules({ override: [override("!a")] }), "!b")).toBe(
			false,
		);
	});

	it("ignores disabled, notifying and broader override rules", () => {
		const muted = mutedRoomIds(
			rules({
				override: [
					override("!off", { enabled: false }),
					override("!loud", { actions: ["notify"] }),
					override("!two", {
						conditions: [
							{ kind: "event_match", key: "room_id", pattern: "!two" },
							{ kind: "event_match", key: "type", pattern: "m.room.message" },
						],
					}),
					{
						rule_id: ".m.rule.suppress_notices",
						default: true,
						enabled: true,
						conditions: [
							{ kind: "event_match", key: "content.msgtype", pattern: "m.notice" },
						],
						actions: [],
					},
				],
			}),
		);
		expect([...muted]).toEqual([]);
	});

	it("honours a room rule muted by another client", () => {
		const muted = mutedRoomIds(
			rules({
				room: [
					{ rule_id: "!legacy", enabled: true, default: false, actions: ["dont_notify"] },
					{ rule_id: "!all", enabled: true, default: false, actions: ["notify"] },
				],
			}),
		);
		expect([...muted]).toEqual(["!legacy"]);
	});

	it("is empty before the first sync delivers push rules", () => {
		expect(mutedRoomIds(undefined).size).toBe(0);
	});
});

describe("canPostAnnouncements", () => {
	it("shows the composer to a super admin or a hub admin only", () => {
		expect(canPostAnnouncements({ isSuperAdmin: true })).toBe(true);
		expect(canPostAnnouncements({ isStaff: true })).toBe(true);
		expect(canPostAnnouncements({ isSuperAdmin: false, isStaff: false })).toBe(
			false,
		);
		expect(canPostAnnouncements({})).toBe(false);
		expect(canPostAnnouncements(null)).toBe(false);
	});
});

describe("isGdhubUserId", () => {
	it("matches the GDHub account on any homeserver, nobody else", () => {
		expect(isGdhubUserId("@gdhub:chat.gdhub.io")).toBe(true);
		expect(isGdhubUserId("@gdhubfan:chat.gdhub.io")).toBe(false);
		expect(isGdhubUserId(null)).toBe(false);
	});
});
