import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckpointStatus } from "@/config/prisma-enums";
import { callState, parseCallRoomName } from "@/lib/checkpoint-call";

const sessionFindUnique = vi.fn();
const sessionUpdate = vi.fn();
const sessionUpdateMany = vi.fn();
const checkpointUpdateMany = vi.fn();
const planFind = vi.fn(async () => ({
	curatorId: "curator",
	goal: "A greybox",
	goalAgreedAt: null,
	startedAt: new Date("2026-10-21T00:00:00Z"),
	project: { authorId: "author" },
	sessions: [
		{
			index: 1,
			scheduledAt: new Date("2026-10-21T14:00:00Z"),
			endedAt: null,
			contentStatus: null,
		},
	],
	items: [],
}));
const callRoom = vi.fn(async () => "https://gdhub.daily.co/cp-abc-2");
const callToken = vi.fn(async () => "token");
const closeCallRoom = vi.fn(async () => undefined);
const roomParticipantMinutes = vi.fn(async () => 120);
const startTranscriptJob = vi.fn(async () => ({ id: "job" }));
const transcriptOfJob = vi.fn();

vi.mock("@/services/prisma", () => ({
	prisma: {
		checkpointSession: {
			findUnique: (...a: unknown[]) => sessionFindUnique(...a),
			update: (...a: unknown[]) => sessionUpdate(...a),
			updateMany: (...a: unknown[]) => sessionUpdateMany(...a),
		},
		projectCheckpoint: {
			count: vi.fn(async () => 2),
			findUnique: vi.fn(async () => ({ curatorId: "curator" })),
			findUniqueOrThrow: () => planFind(),
			updateMany: (...a: unknown[]) => checkpointUpdateMany(...a),
		},
	},
}));

vi.mock("@/services/daily", async (importOriginal) => ({
	...(await importOriginal<object>()),
	callRoom: (...a: unknown[]) => callRoom(...(a as [])),
	callToken: (...a: unknown[]) => callToken(...(a as [])),
	closeCallRoom: (...a: unknown[]) => closeCallRoom(...(a as [])),
	roomParticipantMinutes: (...a: unknown[]) =>
		roomParticipantMinutes(...(a as [])),
	startTranscriptJob: (...a: unknown[]) => startTranscriptJob(...(a as [])),
	transcriptOfJob: (...a: unknown[]) => transcriptOfJob(...a),
}));

const {
	endCall,
	getCall,
	joinCall,
	recordMeetingEnded,
	saveTranscript,
	transcribeRecording,
} = await import("@/repositories/checkpoint-call");

const scheduledAt = new Date("2026-10-21T14:00:00Z");
const during = new Date("2026-10-21T14:05:00Z");

const row = (overrides: {
	status?: string;
	onTeam?: boolean;
	curatorJoinedAt?: Date | null;
	endedAt?: Date | null;
}) => ({
	scheduledAt,
	curatorJoinedAt: overrides.curatorJoinedAt ?? null,
	endedAt: overrides.endedAt ?? null,
	checkpoint: {
		projectId: "p1",
		createdAt: new Date("2026-10-01T00:00:00Z"),
		stageName: "Concepting",
		status: overrides.status ?? CheckpointStatus.Active,
		curator: { id: "curator", name: "Patrick Novak", image: null },
		project: {
			name: "Tide",
			slug: "tide",
			team: { members: overrides.onTeam ? [{ id: "m1" }] : [] },
		},
	},
});

const marta = { id: "marta", name: "Marta Ilves" };
const patrick = { id: "curator", name: "Patrick Novak" };

beforeEach(() => vi.clearAllMocks());

describe("callState", () => {
	it("opens fifteen minutes early and closes three hours after the start", () => {
		expect(callState(scheduledAt, null, new Date("2026-10-21T13:44:00Z"))).toBe(
			"early",
		);
		expect(callState(scheduledAt, null, new Date("2026-10-21T13:45:00Z"))).toBe(
			"open",
		);
		expect(callState(scheduledAt, null, new Date("2026-10-21T17:00:00Z"))).toBe(
			"over",
		);
	});

	it("is over once the curator ended it, inside the window too", () => {
		expect(callState(scheduledAt, during, during)).toBe("over");
	});
});

describe("parseCallRoomName", () => {
	it("reads back a checkpoint call's room and nothing else", () => {
		expect(parseCallRoomName("cp-clx9abc-3")).toEqual({
			checkpointId: "clx9abc",
			index: 3,
		});
		expect(parseCallRoomName("reports")).toBeNull();
	});
});

describe("who may see the call", () => {
	it("lets in the curator and the team, nobody else", async () => {
		sessionFindUnique.mockResolvedValue(row({ onTeam: false }));
		expect(await getCall("abc", 2, "stranger", during)).toBeNull();
		expect((await getCall("abc", 2, "curator", during))?.role).toBe("curator");

		sessionFindUnique.mockResolvedValue(row({ onTeam: true }));
		expect((await getCall("abc", 2, "marta", during))?.role).toBe("team");
	});

	it("opens call 1's plan to the curator and the author, not the rest of the team", async () => {
		sessionFindUnique.mockResolvedValue(row({ onTeam: true }));
		expect((await getCall("abc", 1, "marta", during))?.plan.edit).toBeNull();
		expect((await getCall("abc", 1, "author", during))?.plan.edit).toBe(
			"goalAndTasks",
		);
		expect((await getCall("abc", 1, "curator", during))?.plan.edit).toBe(
			"goalAndTasks",
		);
	});

	it("scopes the team lookup to the caller", async () => {
		sessionFindUnique.mockResolvedValue(row({ onTeam: true }));
		await getCall("abc", 2, "marta", during);
		const where =
			sessionFindUnique.mock.calls[0][0].select.checkpoint.select.project.select
				.team.select.members.where;
		expect(where.userId).toBe("marta");
	});

	it("holds no call for a checkpoint that is not running", async () => {
		sessionFindUnique.mockResolvedValue(
			row({ onTeam: true, status: CheckpointStatus.AwaitingCurator }),
		);
		expect(await getCall("abc", 2, "curator", during)).toBeNull();
	});
});

describe("joinCall", () => {
	it("keeps the team out until the curator has joined", async () => {
		sessionFindUnique.mockResolvedValue(row({ onTeam: true }));
		expect(await joinCall("abc", 2, marta, during)).toEqual({
			refused: "curatorNotIn",
		});
		expect(callToken).not.toHaveBeenCalled();
	});

	it("lets the team in once the curator is there, as a plain participant", async () => {
		sessionFindUnique.mockResolvedValue(
			row({ onTeam: true, curatorJoinedAt: during }),
		);
		expect(await joinCall("abc", 2, marta, during)).toEqual({
			url: "https://gdhub.daily.co/cp-abc-2",
			token: "token",
		});
		expect(callToken).toHaveBeenCalledWith(
			expect.objectContaining({ room: "cp-abc-2", curator: false }),
		);
		expect(sessionUpdate).not.toHaveBeenCalled();
	});

	it("opens the call with the curator's first token", async () => {
		sessionFindUnique.mockResolvedValue(row({}));
		await joinCall("abc", 2, patrick, during);
		expect(callToken).toHaveBeenCalledWith(
			expect.objectContaining({ curator: true }),
		);
		expect(sessionUpdate).toHaveBeenCalledWith({
			where: { checkpointId_index: { checkpointId: "abc", index: 2 } },
			data: { curatorJoinedAt: during },
		});
	});

	it("gives no token outside the window", async () => {
		sessionFindUnique.mockResolvedValue(row({}));
		expect(
			await joinCall("abc", 2, patrick, new Date("2026-10-21T13:00:00Z")),
		).toEqual({ refused: "notOpen" });
	});
});

describe("endCall", () => {
	it("is the curator's alone", async () => {
		sessionFindUnique.mockResolvedValue(row({ onTeam: true }));
		expect(await endCall("abc", 2, "marta", during)).toBe(false);
		expect(closeCallRoom).not.toHaveBeenCalled();

		expect(await endCall("abc", 2, "curator", during)).toBe(true);
		expect(sessionUpdateMany).toHaveBeenCalledWith({
			where: { checkpointId: "abc", index: 2, endedAt: null },
			data: { endedAt: during },
		});
		expect(closeCallRoom).toHaveBeenCalledWith("cp-abc-2");
		expect(checkpointUpdateMany).not.toHaveBeenCalled();
	});

	it("agrees the goal when call 1 ends", async () => {
		sessionFindUnique.mockResolvedValue(row({}));
		await endCall("abc", 1, "curator", during);
		expect(checkpointUpdateMany).toHaveBeenCalledWith({
			where: { id: "abc", goalAgreedAt: null },
			data: { goalAgreedAt: during, goalAgreedById: "curator" },
		});
	});
});

describe("Daily's webhooks", () => {
	it("keeps the curator's end and counts the room's minutes", async () => {
		sessionFindUnique.mockResolvedValue({ endedAt: during });
		await recordMeetingEnded("cp-abc-2", new Date("2026-10-21T15:00:00Z"));
		expect(sessionUpdate).toHaveBeenCalledWith({
			where: { checkpointId_index: { checkpointId: "abc", index: 2 } },
			data: { endedAt: during, participantMinutes: 120 },
		});
	});

	it("ignores rooms that are not checkpoint calls", async () => {
		await recordMeetingEnded("reports", during);
		await transcribeRecording("reports", "rec");
		expect(sessionUpdate).not.toHaveBeenCalled();
		expect(startTranscriptJob).not.toHaveBeenCalled();
	});

	it("adds each recording's transcript once, in order", async () => {
		const first = {
			recordingId: "r1",
			startedAt: "2026-10-21T14:00:00.000Z",
			text: "first",
		};
		transcriptOfJob.mockResolvedValue({
			room: "cp-abc-2",
			recordingId: "r0",
			startedAt: "2026-10-21T13:58:00.000Z",
			text: "earlier",
		});
		sessionFindUnique.mockResolvedValue({ transcript: [first] });
		await saveTranscript("job");
		expect(sessionUpdate.mock.calls[0][0].data.transcript.map((p: { recordingId: string }) => p.recordingId)).toEqual(["r0", "r1"]);

		sessionUpdate.mockClear();
		transcriptOfJob.mockResolvedValue({ ...first, room: "cp-abc-2" });
		await saveTranscript("job");
		expect(sessionUpdate).not.toHaveBeenCalled();
	});
});

describe("the webhook route", () => {
	const secret = Buffer.from("daily-secret").toString("base64");

	const post = async (body: string, signature?: string) => {
		process.env.DAILY_WEBHOOK_SECRET = secret;
		const timestamp = "1792000000";
		const signed =
			signature ??
			createHmac("sha256", Buffer.from(secret, "base64"))
				.update(`${timestamp}.${body}`)
				.digest("base64");
		const { POST } = await import("@/app/api/daily/webhooks/route");
		const { NextRequest } = await import("next/server");
		return POST(
			new NextRequest("http://localhost/api/daily/webhooks", {
				method: "POST",
				body,
				headers: {
					"x-webhook-timestamp": timestamp,
					"x-webhook-signature": signed,
				},
			}),
		);
	};

	it("refuses an unsigned event", async () => {
		const response = await post(
			JSON.stringify({ type: "meeting.ended", payload: {} }),
			"forged",
		);
		expect(response.status).toBe(401);
		expect(sessionFindUnique).not.toHaveBeenCalled();
	});

	it("starts a transcript for a finished recording", async () => {
		const response = await post(
			JSON.stringify({
				type: "recording.ready-to-download",
				payload: { room_name: "cp-abc-2", recording_id: "rec" },
			}),
		);
		expect(response.status).toBe(200);
		expect(startTranscriptJob).toHaveBeenCalledWith("rec");
	});
});
