import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { planEdit } from "@/lib/checkpoint-call";

const checkpointFindUnique = vi.fn();
const checkpointUpdate = vi.fn();
const checkpointUpdateMany = vi.fn();
const itemCreate = vi.fn();
const itemUpdate = vi.fn();
const itemDelete = vi.fn();

vi.mock("@/services/prisma", () => ({
	prisma: {
		$transaction: vi.fn(async (ops: unknown[]) => ops),
		projectCheckpoint: {
			findUnique: (...a: unknown[]) => checkpointFindUnique(...a),
			update: (...a: unknown[]) => checkpointUpdate(...a),
			updateMany: (...a: unknown[]) => checkpointUpdateMany(...a),
		},
		checkpointItem: {
			create: (...a: unknown[]) => itemCreate(...a),
			update: (...a: unknown[]) => itemUpdate(...a),
			delete: (...a: unknown[]) => itemDelete(...a),
		},
	},
}));

const { agreeGoal, changePlan } = await import(
	"@/repositories/checkpoint-plan-edit"
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
		{ id: "open", order: 1, text: "Greybox", originalText: null, artifactId: null },
		{ id: "done", order: 2, text: "One-pager", originalText: null, artifactId: "a1" },
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

	it("keeps the goal and tasks open after call 1 until noon the next day (GDHUB-117)", () => {
		const agreed = { curatorKind: human, startedAt, goalAgreedAt: duringCall1, sessions };
		expect(planEdit(agreed, new Date("2026-10-05T23:30:00Z"))).toBe(
			"goalAndTasks",
		);
		expect(planEdit(agreed, new Date("2026-10-06T11:59:00Z"))).toBe(
			"goalAndTasks",
		);
		expect(planEdit(agreed, new Date("2026-10-06T12:00:00Z"))).toBeNull();
	});

	describe("with the AI curator", () => {
		// No calls: its sessions are review days at UTC midnight, the goal agreed at payment.
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

		it("opens the goal and tasks for 24 hours from payment (GDHUB-117)", () => {
			const paid = { ...ai, goalAgreedAt: new Date("2026-10-05T15:00:00Z") };
			expect(planEdit(paid, new Date("2026-10-05T16:00:00Z"))).toBe(
				"goalAndTasks",
			);
			expect(planEdit(paid, new Date("2026-10-06T14:59:00Z"))).toBe(
				"goalAndTasks",
			);
			expect(planEdit(paid, new Date("2026-10-06T15:00:00Z"))).toBeNull();
		});

		it("counts the 24 hours from a later start day the author picked", () => {
			const later = { ...ai, goalAgreedAt: new Date("2026-10-02T15:00:00Z") };
			expect(planEdit(later, new Date("2026-10-05T23:00:00Z"))).toBe(
				"goalAndTasks",
			);
			expect(planEdit(later, new Date("2026-10-06T00:00:00Z"))).toBeNull();
		});

		it("opens them on the record for a day after the sprint 2 review", () => {
			expect(planEdit(ai, new Date("2026-10-19T12:00:00Z"))).toBe("tasks");
			expect(planEdit(ai, new Date("2026-10-20T00:59:00Z"))).toBe("tasks");
			expect(planEdit(ai, new Date("2026-10-20T01:00:00Z"))).toBeNull();
		});

		it("lets the author change the goal on day 1, and write the start freely", async () => {
			const start = new Date("2026-10-05T09:00:00Z");
			checkpointFindUnique.mockResolvedValue(
				plan({ ...ai, curatorId: null }),
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
						{ id: "open", order: 1, text: "Second", originalText: "First", artifactId: null },
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
