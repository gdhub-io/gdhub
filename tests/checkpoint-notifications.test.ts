import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckpointStatus } from "@/config/prisma-enums";

const send = vi.fn();
const sessionFindMany = vi.fn();
const checkpointFindMany = vi.fn();
const checkpointFindUnique = vi.fn();
const reportCount = vi.fn();
const userFindMany = vi.fn();
const journal = vi.fn();

vi.mock("@/services/novu", () => ({
	NovuService: { send: (...a: unknown[]) => send(...a) },
}));
vi.mock("@/repositories/checkpoints/journal", () => ({
	journal: (...a: unknown[]) => journal(...a),
}));
vi.mock("@/repositories/checkpoints/number", () => ({
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

const { notifyAuthorOfAnswer } = await import(
	"@/services/checkpoints/notifications"
);
const {
	remindCallsSoon,
	remindDevlogsDue,
	remindEvidenceDue,
	remindPlansUnsent,
	remindScopeClosing,
	remindVerdictsDue,
} = await import("@/services/checkpoints/reminders");

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
			/\/user\/project\/hollow-tide\/workflow\/cp2\?sprint=2$/,
		);
		// The time is in the key, so a moved call is announced again.
	expect(byUser.oleg.transactionId).toBe("cp-call-s2-1792591200000-oleg");
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
		// The letter goes into the checkpoint's journal as the platform's step.
		expect(args.payload).not.toHaveProperty("checkpointId");
		expect(journal).toHaveBeenCalledWith(
			expect.objectContaining({
				checkpointId: "cp",
				kind: "Platform",
				output: expect.objectContaining({ title: "Patrick can't take Checkpoint 2", sent: true }),
			}),
		);
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
	const firstSession = (
		createdAt: string,
		checkpointId = "cp",
		timezone: string | null = null,
	) => ({
		checkpointId,
		createdAt: new Date(createdAt),
		checkpoint: {
			projectId: "p",
			createdAt: new Date(),
			project: {
				slug: "hollow-tide",
				author: { ...person("author"), profile: { timezone } },
			},
		},
	});

	it("asks for unchecked plans paid one to four days ago", async () => {
		sessionFindMany.mockResolvedValue([]);
		await remindPlansUnsent(new Date("2026-10-06T10:00:00Z"));
		expect(sessionFindMany.mock.calls[0][0].where).toMatchObject({
			index: 1,
			createdAt: {
				gt: new Date("2026-10-02T10:00:00Z"),
				lte: new Date("2026-10-05T10:00:00Z"),
			},
			checkpoint: {
				goalAgreedAt: null,
				planCheckedAt: null,
				status: CheckpointStatus.Active,
			},
		});
	});

	it("reminds on the first 10:00 past each mark, in the author's zone", async () => {
		sessionFindMany.mockResolvedValue([
			// Paid 30 hours ago: past the 24-hour mark.
			firstSession("2026-10-05T04:00:00Z"),
			// Paid 75 hours ago: past the 72-hour mark.
			firstSession("2026-10-03T07:00:00Z", "late"),
			// Paid 30 hours ago, but it is 13:00 in Moscow.
			firstSession("2026-10-05T04:00:00Z", "msk", "Europe/Moscow"),
		]);
		expect(await remindPlansUnsent(new Date("2026-10-06T10:00:00Z"))).toBe(2);
		expect(send.mock.calls.map(([call]) => call.transactionId)).toEqual([
			"cp-plan-remind-cp-24",
			"cp-plan-remind-late-72",
		]);
	});

	it("stays quiet between the marks", async () => {
		// Paid 50 hours ago: the first reminder's day is over, the second not due.
		sessionFindMany.mockResolvedValue([firstSession("2026-10-04T08:00:00Z")]);
		expect(await remindPlansUnsent(new Date("2026-10-06T10:00:00Z"))).toBe(0);
		expect(send).not.toHaveBeenCalled();
	});
});

describe("remindScopeClosing", () => {
	const scope = (content: unknown) => ({
		id: "s3",
		content,
		checkpoint: {
			projectId: "p",
			createdAt: new Date(),
			project: { slug: "hollow-tide", author: person("author") },
		},
	});

	it("reminds four hours before the day-15 change closes, unless confirmed", async () => {
		sessionFindMany.mockResolvedValue([scope(null)]);
		expect(await remindScopeClosing(new Date("2026-10-20T08:30:00Z"))).toBe(1);
		// The change closes 24 hours after the review: reviews that ended 20 to 21 hours ago.
		expect(sessionFindMany.mock.calls[0][0].where).toMatchObject({
			index: 3,
			checkpoint: { scopeConfirmedAt: null },
			endedAt: {
				gte: new Date("2026-10-19T11:00:00Z"),
				lt: new Date("2026-10-19T12:00:00Z"),
			},
		});
		expect(send.mock.calls[0][0].transactionId).toBe("cp-scope-closing-s3");
	});
});

describe("remindEvidenceDue", () => {
	const running = (items: { text: string }[]) => ({
		id: "cp",
		projectId: "p",
		createdAt: new Date(),
		project: { slug: "hollow-tide", author: person("author") },
		items,
	});

	it("asks only for checkpoints on day 26 with a task still unproven", async () => {
		checkpointFindMany.mockResolvedValue([]);
		await remindEvidenceDue(new Date("2026-10-26T09:00:00Z"));
		expect(checkpointFindMany.mock.calls[0][0].where).toMatchObject({
			status: CheckpointStatus.Active,
			// Day 26 on 26 Oct is a checkpoint started on 1 Oct, any hour of it.
			startedAt: {
				gte: new Date("2026-10-01T00:00:00Z"),
				lt: new Date("2026-10-02T00:00:00Z"),
			},
			items: { some: { cut: false, artifactId: null } },
		});
	});

	it("names the tasks without evidence", async () => {
		checkpointFindMany.mockResolvedValue([
			running([{ text: "Island demo" }, { text: "Playtest" }]),
		]);
		expect(await remindEvidenceDue(new Date("2026-10-26T09:00:00Z"))).toBe(1);
		expect(send.mock.calls[0][0].payload.message).toContain(
			'"Island demo", "Playtest"',
		);
	});
});
