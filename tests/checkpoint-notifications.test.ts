import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckpointStatus } from "@/config/prisma-enums";

const send = vi.fn();
const sessionFindMany = vi.fn();
const checkpointFindMany = vi.fn();
const checkpointFindUnique = vi.fn();
const reportCount = vi.fn();

vi.mock("@/services/novu", () => ({
	NovuService: { send: (...a: unknown[]) => send(...a) },
}));
vi.mock("@/repositories/checkpoint-number", () => ({
	checkpointNumber: vi.fn(async () => 2),
}));
vi.mock("@/services/prisma", () => ({
	prisma: {
		checkpointSession: {
			findMany: (...a: unknown[]) => sessionFindMany(...a),
		},
		projectCheckpoint: {
			findMany: (...a: unknown[]) => checkpointFindMany(...a),
			findUnique: (...a: unknown[]) => checkpointFindUnique(...a),
		},
		projectReport: { count: (...a: unknown[]) => reportCount(...a) },
	},
}));

const { notifyAuthorOfAnswer, remindCallsSoon, remindDevlogsDue } =
	await import("@/services/checkpoint-notifications");

const person = (id: string) => ({ id, email: `${id}@x.test` });

beforeEach(() => vi.clearAllMocks());

describe("remindCallsSoon", () => {
	const call = {
		id: "s2",
		index: 2,
		scheduledAt: new Date("2026-10-21T14:00:00Z"),
		checkpointId: "cp",
		checkpoint: {
			projectId: "p",
			createdAt: new Date(),
			curator: {
				...person("curator"),
				advisorAvailability: { timeZone: "Europe/Minsk" },
			},
			project: {
				name: "Hollow Tide",
				slug: "hollow-tide",
				author: person("author"),
				team: {
					members: [{ user: person("author") }, { user: person("oleg") }],
				},
			},
		},
	};

	it("looks one to two hours ahead from the top of the hour, a late run too", async () => {
		sessionFindMany.mockResolvedValue([]);
		await remindCallsSoon(new Date("2026-10-21T13:00:07Z"));
		expect(sessionFindMany.mock.calls[0][0].where).toMatchObject({
			scheduledAt: {
				gte: new Date("2026-10-21T14:00:00Z"),
				lt: new Date("2026-10-21T15:00:00Z"),
			},
			endedAt: null,
			checkpoint: {
				status: { in: [CheckpointStatus.Active, CheckpointStatus.Review] },
			},
		});
	});

	it("tells the curator in their zone and each team member once, in UTC", async () => {
		sessionFindMany.mockResolvedValue([call]);
		expect(await remindCallsSoon(new Date("2026-10-21T13:00:00Z"))).toBe(3);

		const byUser = Object.fromEntries(
			send.mock.calls.map(([args]) => [args.to.subscriberId, args]),
		);
		expect(Object.keys(byUser).sort()).toEqual(["author", "curator", "oleg"]);
		expect(byUser.curator.payload.message).toContain("17:00 (Europe/Minsk)");
		expect(byUser.curator.payload.redirectUrl).toMatch(
			/\/advisor\/checkpoints\/cp\/review\/2$/,
		);
		expect(byUser.oleg.payload.message).toContain("14:00 (UTC)");
		expect(byUser.oleg.payload.redirectUrl).toMatch(
			/\/user\/project\/hollow-tide\/workflow\/cp2\/review\/2$/,
		);
		expect(byUser.oleg.transactionId).toBe("cp-call-s2-oleg");
	});
});

describe("remindDevlogsDue", () => {
	// Started Monday 5 Oct: day 7, the last of sprint 1, is Sunday 11 Oct.
	const checkpoint = {
		id: "cp",
		projectId: "p",
		startedAt: new Date("2026-10-05T00:00:00Z"),
		project: { name: "Hollow Tide", slug: "hollow-tide", author: person("author") },
	};

	it("reminds the author on the sprint's last day when no devlog landed", async () => {
		checkpointFindMany.mockResolvedValue([checkpoint]);
		reportCount.mockResolvedValue(0);
		expect(await remindDevlogsDue(new Date("2026-10-11T01:00:00Z"))).toBe(1);
		expect(reportCount.mock.calls[0][0].where.publishedAt).toEqual({
			gte: new Date("2026-10-05T00:00:00Z"),
			lt: new Date("2026-10-12T00:00:00Z"),
		});
		expect(send.mock.calls[0][0].transactionId).toBe("cp-devlog-cp-1");
	});

	it("stays quiet on other days and once the devlog is in", async () => {
		checkpointFindMany.mockResolvedValue([checkpoint]);
		reportCount.mockResolvedValue(0);
		expect(await remindDevlogsDue(new Date("2026-10-10T01:00:00Z"))).toBe(0);

		reportCount.mockResolvedValue(1);
		expect(await remindDevlogsDue(new Date("2026-10-11T01:00:00Z"))).toBe(0);
		expect(send).not.toHaveBeenCalled();
	});
});

describe("notifyAuthorOfAnswer", () => {
	it("names the curator who said no and sends the author back to Workflow", async () => {
		checkpointFindUnique.mockResolvedValue({
			projectId: "p",
			createdAt: new Date("2026-10-01T00:00:00Z"),
			startedAt: null,
			project: { slug: "hollow-tide", author: person("author") },
		});
		await notifyAuthorOfAnswer("cp", "Patrick", "declined");
		const [args] = send.mock.calls[0];
		expect(args.to.subscriberId).toBe("author");
		expect(args.payload.title).toBe("Patrick can't take Checkpoint 2");
		expect(args.payload.redirectUrl).toMatch(/\/user\/project\/hollow-tide\/workflow$/);
	});

	it("never lets a Novu failure reach the caller", async () => {
		checkpointFindUnique.mockResolvedValue({
			projectId: "p",
			createdAt: new Date(),
			startedAt: null,
			project: { slug: "hollow-tide", author: person("author") },
		});
		send.mockRejectedValueOnce(new Error("down"));
		await expect(
			notifyAuthorOfAnswer("cp", "Patrick", "silent"),
		).resolves.toBeUndefined();
	});
});
