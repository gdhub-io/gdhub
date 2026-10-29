import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { planCloses, planEdit } from "@/lib/checkpoints/call";

const checkpointFindUnique = vi.fn();
const checkpointUpdate = vi.fn();
const checkpointUpdateMany = vi.fn();
const itemCreate = vi.fn();
const itemUpdate = vi.fn();
const itemDelete = vi.fn();
const sessionUpdate = vi.fn();
const checkpointFindMany = vi.fn();
const notifyPlanApproved = vi.fn();
const writePlanLetter = vi.fn();

vi.mock("@/services/prisma", () => ({
	prisma: {
		$transaction: vi.fn(async (ops: unknown[]) => ops),
		projectCheckpoint: {
			findUnique: (...a: unknown[]) => checkpointFindUnique(...a),
			findMany: (...a: unknown[]) => checkpointFindMany(...a),
			update: (...a: unknown[]) => checkpointUpdate(...a),
			updateMany: (...a: unknown[]) => checkpointUpdateMany(...a),
		},
		checkpointSession: {
			update: (...a: unknown[]) => sessionUpdate(...a),
		},
		checkpointItem: {
			create: (...a: unknown[]) => itemCreate(...a),
			update: (...a: unknown[]) => itemUpdate(...a),
			delete: (...a: unknown[]) => itemDelete(...a),
		},
	},
}));

vi.mock("@/services/checkpoints/notifications", () => ({
	notifyPlanApproved: (...a: unknown[]) => notifyPlanApproved(...a),
}));
vi.mock("@/services/checkpoints/flows/ai-curator", () => ({
	writePlanLetter: (...a: unknown[]) => writePlanLetter(...a),
}));

const { agreeGoal, changePlan } = await import(
	"@/repositories/checkpoints/plan-edit"
);
const { approveCheckedPlans, approvePlan } = await import(
	"@/services/checkpoints/flows/plan-edit"
);

// The checkpoint starts on Monday 5 Oct; call 1 is that day at 14:00,
// call 3 on day 15 (19 Oct) at 14:00.
const startedAt = new Date("2026-10-05T00:00:00Z");
const call1 = new Date("2026-10-05T14:00:00Z");
const call3 = new Date("2026-10-19T14:00:00Z");
const sessions = [
	{ index: 1, scheduledAt: call1, endedAt: null as Date | null },
	{ index: 3, scheduledAt: call3, endedAt: null as Date | null },
];

const duringCall1 = new Date("2026-10-05T14:10:00Z");
const duringCall3 = new Date("2026-10-19T14:10:00Z");
const between = new Date("2026-10-12T10:00:00Z");

const human = CheckpointCuratorKind.Human;

const plan = (overrides: Record<string, unknown> = {}) => ({
	curatorId: "curator",
	curatorKind: human,
	startedAt,
	goalAgreedAt: null,
	project: { authorId: "author" },
	sessions,
	items: [
		{ id: "open", order: 1, text: "Greybox", originalText: null, _count: { evidence: 0 } },
		{ id: "done", order: 2, text: "One-pager", originalText: null, _count: { evidence: 1 } },
	],
	...overrides,
});

beforeEach(() => vi.clearAllMocks());

describe("planEdit", () => {
	it("drafts the tasks before call 1, opens the goal and tasks on it, the tasks alone on call 3, nothing between", () => {
		const checkpoint = { curatorKind: human, startedAt, goalAgreedAt: null, sessions };
		expect(planEdit(checkpoint, new Date("2026-10-05T09:00:00Z"))).toBe("plan");
		expect(planEdit(checkpoint, duringCall1)).toBe("goalAndTasks");
		expect(planEdit(checkpoint, between)).toBeNull();
		expect(planEdit(checkpoint, duringCall3)).toBe("tasks");
	});

	it("keeps the goal and tasks open for 12 hours after call 1 ends", () => {
		const ended = [
			{ ...sessions[0], endedAt: new Date("2026-10-05T15:00:00Z") },
			sessions[1],
		];
		const agreed = { curatorKind: human, startedAt, goalAgreedAt: duringCall1, sessions: ended };
		expect(planEdit(agreed, new Date("2026-10-06T02:59:00Z"))).toBe(
			"goalAndTasks",
		);
		expect(planEdit(agreed, new Date("2026-10-06T03:00:00Z"))).toBeNull();
	});

	it("counts the 12 hours from the room closing when nobody ended call 1", () => {
		// The room closes three hours after the start: 17:00, so 05:00 the next day.
		const agreed = { curatorKind: human, startedAt, goalAgreedAt: duringCall1, sessions };
		expect(planEdit(agreed, new Date("2026-10-06T04:59:00Z"))).toBe(
			"goalAndTasks",
		);
		expect(planEdit(agreed, new Date("2026-10-06T05:00:00Z"))).toBeNull();
	});

	describe("with the AI curator", () => {
		// No calls: its sessions are review days at UTC midnight; the plan approved on day 1.
		const aiSessions = [
			{ index: 1, scheduledAt: startedAt, endedAt: null as Date | null },
			{
				index: 3,
				scheduledAt: new Date("2026-10-19T00:00:00Z"),
				endedAt: new Date("2026-10-19T01:00:00Z"),
			},
		];
		const ai = {
			curatorKind: CheckpointCuratorKind.AI,
			startedAt,
			goalAgreedAt: startedAt,
			sessions: aiSessions,
		};

		it("keeps the goal and tasks open until the plan is approved (GDHUB-117)", () => {
			const waiting = { ...ai, goalAgreedAt: null };
			// No deadline before approval: a week later the author can still write.
			expect(planEdit(waiting, new Date("2026-10-12T16:00:00Z"))).toBe(
				"goalAndTasks",
			);
			expect(planEdit(ai, new Date("2026-10-05T16:00:00Z"))).toBeNull();
		});

		it("approves itself 12 hours after the check", () => {
			const checked = {
				...ai,
				goalAgreedAt: null,
				planCheckedAt: new Date("2026-10-05T15:00:00Z"),
			};
			expect(planCloses(checked)).toEqual(new Date("2026-10-06T03:00:00Z"));
			expect(planCloses({ ...checked, planCheckedAt: null })).toBeNull();
		});

		it("opens them on the record for a day after the sprint 2 review", () => {
			expect(planEdit(ai, new Date("2026-10-19T12:00:00Z"))).toBe("tasks");
			expect(planEdit(ai, new Date("2026-10-20T00:59:00Z"))).toBe("tasks");
			expect(planEdit(ai, new Date("2026-10-20T01:00:00Z"))).toBeNull();
		});

		it("lets the author change the goal on day 1, and write the start freely", async () => {
			const start = new Date("2026-10-05T09:00:00Z");
			checkpointFindUnique.mockResolvedValue(
				plan({ ...ai, goalAgreedAt: null, curatorId: null }),
			);
			expect(
				await changePlan("cp", "author", { op: "goal", goal: "Other" }, start),
			).toBeNull();
			await changePlan("cp", "author", { op: "remove", itemId: "open" }, start);
			expect(itemDelete).toHaveBeenCalledWith({ where: { id: "open" } });
		});
	});
});

describe("changePlan", () => {
	it("lets only the curator and the project's author edit", async () => {
		checkpointFindUnique.mockResolvedValue(plan());
		const change = { op: "goal" as const, goal: "A greybox" };
		expect(await changePlan("cp", "teammate", change, duringCall1)).toBe(
			"forbidden",
		);
		expect(await changePlan("cp", "author", change, duringCall1)).toBeNull();
		expect(await changePlan("cp", "curator", change, duringCall1)).toBeNull();
	});

	it("lets the author draft tasks before call 1, never the goal", async () => {
		checkpointFindUnique.mockResolvedValue(plan());
		const before = new Date("2026-10-05T09:00:00Z");
		expect(
			await changePlan("cp", "author", { op: "goal", goal: "Other" }, before),
		).toBe("goalLocked");
		expect(
			await changePlan("cp", "author", { op: "add", text: "Draft" }, before),
		).toBeNull();
	});

	it("refuses outside the calls' windows", async () => {
		checkpointFindUnique.mockResolvedValue(plan());
		expect(
			await changePlan("cp", "author", { op: "add", text: "x" }, between),
		).toBe("planClosed");
	});

	it("edits call 1 in place and deletes a removed task", async () => {
		checkpointFindUnique.mockResolvedValue(plan());
		await changePlan("cp", "author", { op: "edit", itemId: "open", text: "Greybox build" }, duringCall1);
		expect(itemUpdate).toHaveBeenCalledWith({
			where: { id: "open" },
			data: { text: "Greybox build" },
		});
		await changePlan("cp", "author", { op: "remove", itemId: "open" }, duringCall1);
		expect(itemDelete).toHaveBeenCalledWith({ where: { id: "open" } });
		expect(checkpointUpdateMany).not.toHaveBeenCalled();
	});

	describe("on call 3", () => {
		it("keeps the goal and the done tasks", async () => {
			checkpointFindUnique.mockResolvedValue(plan());
			expect(
				await changePlan("cp", "author", { op: "goal", goal: "Other" }, duringCall3),
			).toBe("goalLocked");
			expect(
				await changePlan("cp", "author", { op: "remove", itemId: "done" }, duringCall3),
			).toBe("taskDone");
		});

		it("keeps the record: first wording, cut instead of delete, dated additions", async () => {
			checkpointFindUnique.mockResolvedValue(plan());
			await changePlan("cp", "curator", { op: "edit", itemId: "open", text: "Greybox in the browser" }, duringCall3);
			expect(itemUpdate).toHaveBeenCalledWith({
				where: { id: "open" },
				data: { text: "Greybox in the browser", originalText: "Greybox" },
			});

			await changePlan("cp", "curator", { op: "remove", itemId: "open" }, duringCall3);
			expect(itemDelete).not.toHaveBeenCalled();
			expect(itemUpdate).toHaveBeenLastCalledWith({
				where: { id: "open" },
				data: { cut: true },
			});

			await changePlan("cp", "curator", { op: "add", text: "Stranger test" }, duringCall3);
			expect(itemCreate.mock.calls[0][0].data).toMatchObject({
				order: 3,
				text: "Stranger test",
				addedAt: duringCall3,
			});
			expect(checkpointUpdateMany).toHaveBeenCalledWith({
				where: { id: "cp", revisedAt: null },
				data: { revisedAt: duringCall3 },
			});
		});

		it("does not overwrite the first wording on a second edit", async () => {
			checkpointFindUnique.mockResolvedValue(
				plan({
					items: [
						{ id: "open", order: 1, text: "Second", originalText: "First", _count: { evidence: 0 } },
					],
				}),
			);
			await changePlan("cp", "author", { op: "edit", itemId: "open", text: "Third" }, duringCall3);
			expect(itemUpdate.mock.calls[0][0].data).toEqual({ text: "Third" });
		});
	});
});

describe("agreeGoal", () => {
	it("stamps the curator's agreement once", async () => {
		checkpointFindUnique.mockResolvedValue({ curatorId: "curator" });
		await agreeGoal("cp", duringCall1);
		expect(checkpointUpdateMany).toHaveBeenCalledWith({
			where: { id: "cp", goalAgreedAt: null },
			data: { goalAgreedAt: duringCall1, goalAgreedById: "curator" },
		});
	});
});

describe("approvePlan, with the AI curator", () => {
	const ai = CheckpointCuratorKind.AI;
	const aiPlan = (overrides: Record<string, unknown> = {}) =>
		plan({
			curatorId: null,
			curatorKind: ai,
			planCheckedAt: startedAt,
			scopeConfirmedAt: null,
			sessions: [
				{ id: "s1", index: 1, scheduledAt: startedAt, endedAt: null },
				{
					id: "s3",
					index: 3,
					scheduledAt: new Date("2026-10-19T00:00:00Z"),
					endedAt: new Date("2026-10-19T01:00:00Z"),
				},
			],
			items: [{ id: "open" }],
			...overrides,
		});
	const day1 = new Date("2026-10-05T10:00:00Z");

	beforeEach(() => vi.clearAllMocks());

	it("approves the checked plan on day 1, by the author only", async () => {
		checkpointFindUnique.mockResolvedValue(aiPlan());
		expect(await approvePlan("cp", "stranger", day1)).toBe("forbidden");
		checkpointUpdateMany.mockResolvedValue({ count: 1 });
		expect(await approvePlan("cp", "author", day1)).toBeNull();
		expect(checkpointUpdateMany).toHaveBeenCalledWith({
			where: { id: "cp", goalAgreedAt: null },
			data: { goalAgreedAt: day1, goalAgreedById: "author" },
		});
		// The letter the team reads through sprint 1.
		expect(writePlanLetter).toHaveBeenCalledWith("cp");
	});

	it("refuses before the check and with no tasks", async () => {
		checkpointFindUnique.mockResolvedValue(
			aiPlan({ planCheckedAt: null }),
		);
		expect(await approvePlan("cp", "author", day1)).toBe("notChecked");
		checkpointFindUnique.mockResolvedValue(aiPlan({ items: [] }));
		expect(await approvePlan("cp", "author", day1)).toBe("noTasks");
		expect(checkpointUpdateMany).not.toHaveBeenCalled();
	});

	it("confirms the tasks on day 15, which closes the window early", async () => {
		const approved = aiPlan({ goalAgreedAt: day1 });
		const day15 = new Date("2026-10-19T12:00:00Z");
		checkpointFindUnique.mockResolvedValue(approved);
		expect(await approvePlan("cp", "author", day15)).toBeNull();
		expect(checkpointUpdateMany).toHaveBeenCalledWith({
			where: { id: "cp", scopeConfirmedAt: null },
			data: { scopeConfirmedAt: day15 },
		});

		const confirmed = {
			...approved,
			scopeConfirmedAt: day15,
		} as Parameters<typeof planEdit>[0];
		expect(planEdit(confirmed, day15)).toBeNull();
	});

	it("refuses between the two windows", async () => {
		checkpointFindUnique.mockResolvedValue(aiPlan({ goalAgreedAt: day1 }));
		expect(await approvePlan("cp", "author", between)).toBe("planClosed");
	});

	it("approves checked plans 12 hours old, never an empty one, and says so", async () => {
		checkpointFindMany.mockResolvedValue([{ id: "cp1" }, { id: "cp2" }]);
		// cp2 was approved by its author in between.
		checkpointUpdateMany
			.mockResolvedValueOnce({ count: 1 })
			.mockResolvedValueOnce({ count: 0 });
		const now = new Date("2026-10-06T10:00:00Z");
		expect(await approveCheckedPlans(now)).toBe(2);
		expect(checkpointFindMany.mock.calls[0][0].where).toMatchObject({
			curatorKind: ai,
			goalAgreedAt: null,
			items: { some: { cut: false } },
			planCheckedAt: { lte: new Date("2026-10-05T22:00:00Z") },
		});
		expect(checkpointUpdateMany).toHaveBeenCalledWith({
			where: { id: "cp1", goalAgreedAt: null },
			data: { goalAgreedAt: now },
		});
		expect(notifyPlanApproved).toHaveBeenCalledTimes(1);
		expect(notifyPlanApproved).toHaveBeenCalledWith("cp1");
		expect(writePlanLetter).toHaveBeenCalledTimes(1);
		expect(writePlanLetter).toHaveBeenCalledWith("cp1");
	});

});
