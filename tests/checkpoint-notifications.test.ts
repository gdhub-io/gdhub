import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckpointStatus } from "@/config/prisma-enums";

const send = vi.fn();
const sessionFindMany = vi.fn();
const checkpointFindMany = vi.fn();
const checkpointFindUnique = vi.fn();
const reportCount = vi.fn();
const userFindMany = vi.fn();

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
		user: { findMany: (...a: unknown[]) => userFindMany(...a) },
	},
}));

const {
	notifyAuthorOfAnswer,
	remindCallsSoon,
	remindDevlogsDue,
	remindPlansUnsent,
	remindVerdictsDue,
} = await import("@/services/checkpoint-notifications");

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
				author: { ...person("author"), profile: { timezone: "Asia/Tbilisi" } },
				team: {
					members: [
						{
							user: { ...person("author"), profile: { timezone: "Asia/Tbilisi" } },
						},
						{ user: { ...person("oleg"), profile: null } },
					],
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

	it("tells each person once, in their own zone — UTC for whoever has none", async () => {
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
		expect(byUser.author.payload.message).toContain("18:00 (Asia/Tbilisi)");
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

describe("remindVerdictsDue", () => {
	const undecided = (id: string) => ({
		id,
		project: { name: `Project ${id}` },
		curator: person(`curator-${id}`),
	});

	it("chases the curator the day before, and the admins the day after", async () => {
		checkpointFindMany
			.mockResolvedValueOnce([undecided("soon")])
			.mockResolvedValueOnce([undecided("late")]);
		userFindMany.mockResolvedValue([person("admin1"), person("admin2")]);

		const result = await remindVerdictsDue(new Date("2026-10-22T09:00:00Z"));

		expect(result).toEqual({ dueTomorrow: 1, overdue: 1 });
		// dueAt is day 28; the verdict is due by the end of day 31.
		const windows = checkpointFindMany.mock.calls.map(([arg]) => arg.where.dueAt);
		expect(windows).toEqual([
			// Due by 23 Oct: reminded on the 22nd.
			{ gte: new Date("2026-10-20T00:00:00Z"), lt: new Date("2026-10-21T00:00:00Z") },
			// Due by 21 Oct: overdue on the 22nd, and on no other day.
			{ gte: new Date("2026-10-18T00:00:00Z"), lt: new Date("2026-10-19T00:00:00Z") },
		]);
		const ids = send.mock.calls.map(([arg]) => arg.transactionId).sort();
		expect(ids).toEqual([
			"cp-verdict-due-soon",
			"cp-verdict-overdue-late-admin1",
			"cp-verdict-overdue-late-admin2",
		]);
	});

	it("asks only human curators' checkpoints still in review", async () => {
		checkpointFindMany.mockResolvedValue([]);

		await remindVerdictsDue(new Date("2026-10-22T09:00:00Z"));

		expect(checkpointFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					status: CheckpointStatus.Review,
					curatorKind: "Human",
					verdict: null,
				}),
			}),
		);
		expect(userFindMany).not.toHaveBeenCalled();
	});
});

describe("remindPlansUnsent", () => {
	const firstSession = (content: unknown) => ({
		checkpointId: "cp",
		content,
		checkpoint: {
			projectId: "p",
			createdAt: new Date(),
			project: { slug: "hollow-tide", author: person("author") },
		},
	});

	it("looks at checkpoints paid 24 to 25 hours ago, still unapproved", async () => {
		sessionFindMany.mockResolvedValue([]);
		await remindPlansUnsent(new Date("2026-10-06T10:20:00Z"));
		expect(sessionFindMany.mock.calls[0][0].where).toMatchObject({
			index: 1,
			createdAt: {
				gte: new Date("2026-10-05T09:00:00Z"),
				lt: new Date("2026-10-05T10:00:00Z"),
			},
			checkpoint: { goalAgreedAt: null, status: CheckpointStatus.Active },
		});
	});

	it("reminds once, and never a plan already sent for the check", async () => {
		sessionFindMany.mockResolvedValue([
			firstSession({ step: "suggested" }),
			firstSession(null),
			{ ...firstSession({ step: "checked" }), checkpointId: "sent" },
		]);
		expect(await remindPlansUnsent(new Date("2026-10-06T10:20:00Z"))).toBe(2);
		expect(send).toHaveBeenCalledTimes(2);
		expect(send.mock.calls[0][0].transactionId).toBe("cp-plan-remind-cp");
	});
});
