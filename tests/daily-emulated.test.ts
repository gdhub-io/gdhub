import { afterEach, describe, expect, it, vi } from "vitest";
import { dailyEmulated } from "@/lib/stand";
import {
	emulatedDaily,
	emulatedPresence,
	emulatedRecording,
	emulatedRoom,
	emulatedText,
} from "@/services/daily-emulated";

afterEach(() => vi.unstubAllEnvs());

describe("where Daily is emulated", () => {
	it("never in the app the team uses: the stand's own flag is required", () => {
		vi.stubEnv("DAILY_EMULATED", "1");
		vi.stubEnv("E2E_TEST_AUTH", "");
		expect(dailyEmulated()).toBe(false);
	});

	it("never in production, even with every flag set", () => {
		vi.stubEnv("DAILY_EMULATED", "1");
		vi.stubEnv("E2E_TEST_AUTH", "1");
		vi.stubEnv("NODE_ENV", "production");
		expect(dailyEmulated()).toBe(false);
	});

	it("on the stand when asked for", () => {
		vi.stubEnv("DAILY_EMULATED", "1");
		vi.stubEnv("E2E_TEST_AUTH", "1");
		vi.stubEnv("NODE_ENV", "test");
		expect(dailyEmulated()).toBe(true);
	});
});

describe("the emulated Daily", () => {
	const room = `cp-${Date.now()}`;
	const token = (userId: string, owner: boolean) =>
		(
			emulatedDaily("/meeting-tokens", "POST", {
				properties: { room_name: room, user_id: userId, user_name: userId, is_owner: owner },
			}) as { token: string }
		).token;

	it("plays a call: a room, who is in it, the end for everyone, the minutes", () => {
		expect(() => emulatedDaily(`/rooms/${room}`, "GET")).toThrow();
		emulatedDaily("/rooms", "POST", { name: room, properties: { exp: 0 } });

		const curator = token("curator", true);
		const author = token("author", false);
		emulatedPresence(curator, true);
		emulatedPresence(author, true);

		expect(emulatedDaily(`/rooms/${room}/presence`, "GET")).toEqual({
			data: [{ userId: "curator" }, { userId: "author" }],
		});
		expect(emulatedRoom(room).people.find((p) => p.userId === "curator")?.owner).toBe(
			true,
		);

		emulatedDaily(`/rooms/${room}`, "DELETE");
		expect(emulatedRoom(room)).toEqual({ open: false, people: [] });
		const meetings = emulatedDaily(`/meetings?room=${room}`, "GET") as {
			data: { participants: { user_id: string }[] }[];
		};
		expect(meetings.data[0].participants.map((p) => p.user_id)).toEqual([
			"curator",
			"author",
		]);
	});

	it("turns a recording into the fixture transcript", () => {
		const recordingId = emulatedRecording(room);
		const { id } = emulatedDaily("/batch-processor", "POST", {
			inParams: { recordingId },
		}) as { id: string };

		expect(emulatedDaily(`/batch-processor/${id}`, "GET")).toEqual({
			input: { recordingId },
		});
		expect(emulatedDaily(`/recordings/${recordingId}`, "GET")).toMatchObject({
			room_name: room,
		});
		const { transcription } = emulatedDaily(
			`/batch-processor/${id}/access-link`,
			"GET",
		) as { transcription: { link: string }[] };
		expect(emulatedText(transcription[0].link)).toContain("vertical slice");
	});
});
