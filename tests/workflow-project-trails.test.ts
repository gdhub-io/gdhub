import { CheckpointStatus, ProjectStatus } from "@gdhub-io/gdhub-prisma";
import { describe, expect, it } from "vitest";
import {
	TRAILS_RING_STEP,
	TRAILS_STAGE_WEIGHTS,
} from "@/config/project-trails";
import {
	buildTrailsGraph,
	type ProjectTrailRow,
	toProjectTrail,
} from "@/lib/workflow/project-trails";

const steps = ["Introduction", "Ideation", "Prototype", "Production"].map(
	(name, index) => ({
		id: `s${index}`,
		order: index,
		name,
		done: false,
		finishedAt: null as Date | null,
		plannedAt: null as Date | null,
	}),
);

const row = (overrides: Partial<ProjectTrailRow> = {}): ProjectTrailRow => ({
	id: "p1",
	slug: "game",
	name: "Game",
	coverImage: null,
	status: ProjectStatus.Approved,
	createdAt: new Date("2026-11-01T10:00:00Z"),
	workflow: { currentStepId: "s2", steps },
	checkpoints: [],
	...overrides,
});

const checkpoint = (
	stepId: string,
	order: number,
	status: CheckpointStatus,
): ProjectTrailRow["checkpoints"][number] => ({
	stepId,
	order,
	status,
	startedAt: new Date("2026-11-01T00:00:00Z"),
});

describe("toProjectTrail", () => {
	it("maps every public status and drops the rest", () => {
		expect(toProjectTrail(row())?.status).toBe("inProgress");
		expect(toProjectTrail(row({ status: ProjectStatus.Released }))?.status).toBe(
			"released",
		);
		expect(toProjectTrail(row({ status: ProjectStatus.Dormant }))?.status).toBe(
			"abandoned",
		);
		expect(
			toProjectTrail(row({ status: ProjectStatus.KilledWithDignity }))?.status,
		).toBe("cancelled");
		for (const status of [
			ProjectStatus.Registered,
			ProjectStatus.Rejected,
			ProjectStatus.Archived,
		]) {
			expect(toProjectTrail(row({ status }))).toBeNull();
		}
	});

	it("stops the road at the current stage, whatever order the steps come in", () => {
		const path = toProjectTrail(
			row({ workflow: { currentStepId: "s2", steps: [...steps].reverse() } }),
		);
		expect(
			path?.stages.map((stage) => [stage.name, stage.number]),
		).toEqual([
			["Ideation", 2],
			["Prototype", 3],
		]);
	});

	it("falls back to the last finished stage", () => {
		const withDone = steps.map((step, index) => ({ ...step, done: index < 2 }));
		expect(
			toProjectTrail(row({ workflow: { currentStepId: null, steps: withDone } }))
				?.stages.map((stage) => stage.name),
		).toEqual(["Ideation"]);
	});

	it("leaves out a project on Introduction wherever its workflow put it", () => {
		const shuffled = [steps[1], steps[0], steps[2], steps[3]].map(
			(step, order) => ({ ...step, order }),
		);
		expect(
			toProjectTrail(row({ workflow: { currentStepId: "s0", steps: shuffled } })),
		).toBeNull();
		const past = toProjectTrail(
			row({ workflow: { currentStepId: "s2", steps: shuffled } }),
		);
		expect(past?.stages.map((stage) => stage.name)).toEqual([
			"Ideation",
			"Prototype",
		]);
	});

	it("leaves out a project still on the first stage", () => {
		expect(toProjectTrail(row({ workflow: { currentStepId: "s0", steps } }))).toBeNull();
		expect(toProjectTrail(row({ workflow: { currentStepId: null, steps } }))).toBeNull();
	});

	describe("a project that reached Project Completion", () => {
		const completed = (dates: {
			finishedAt?: string;
			plannedAt?: string;
		}): ProjectTrailRow["workflow"] => ({
			currentStepId: "s4",
			steps: [
				...steps,
				{ ...steps[0], id: "s4", order: 4, name: "Project Completion" },
			].map((step) => ({
				...step,
				finishedAt:
					step.id === "s3" && dates.finishedAt ? new Date(dates.finishedAt) : null,
				plannedAt:
					step.id === "s4" && dates.plannedAt ? new Date(dates.plannedAt) : null,
			})),
		});

		it("is left out when it got there within a day of its creation", () => {
			expect(
				toProjectTrail(
					row({ workflow: completed({ finishedAt: "2026-11-02T09:00:00Z" }) }),
				),
			).toBeNull();
		});

		it("reads the date it entered the stage when the one before has none", () => {
			expect(
				toProjectTrail(
					row({ workflow: completed({ plannedAt: "2026-11-01T12:00:00Z" }) }),
				),
			).toBeNull();
		});

		it("stays when it took longer, or nothing says when it got there", () => {
			expect(
				toProjectTrail(
					row({ workflow: completed({ finishedAt: "2026-11-03T10:00:00Z" }) }),
				),
			).not.toBeNull();
			expect(toProjectTrail(row({ workflow: completed({}) }))).not.toBeNull();
		});
	});

	it("keeps only checkpoints that ran, on the stage they ran on", () => {
		const path = toProjectTrail(
			row({
				checkpoints: [
					checkpoint("s1", 2, CheckpointStatus.Closed),
					checkpoint("s1", 1, CheckpointStatus.Closed),
					checkpoint("s2", 1, CheckpointStatus.Active),
					checkpoint("s2", 2, CheckpointStatus.Draft),
					checkpoint("s2", 3, CheckpointStatus.Cancelled),
					checkpoint("s2", 4, CheckpointStatus.AwaitingCurator),
					// A stage the project went back from is no longer on its road.
					checkpoint("s3", 1, CheckpointStatus.Closed),
				],
			}),
		);
		expect(path?.stages[0].checkpoints.map((c) => c.order)).toEqual([1, 2]);
		expect(path?.stages[1].checkpoints.map((c) => c.status)).toEqual([
			"active",
		]);
		expect(path?.stages).toHaveLength(2);
	});
});

it("knows the whole workflow's length and the stage after the current one", () => {
	expect(toProjectTrail(row())).toMatchObject({ stageCount: 4, nextStage: "Production" });
});

describe("buildTrailsGraph", () => {
	const now = new Date("2026-11-15T00:00:00Z");

	it("marks the current stage when no checkpoint is running", () => {
		const path = toProjectTrail(row());
		if (!path) throw new Error("no path");
		const graph = buildTrailsGraph([path], { center: 0, now });
		const current = graph.points.filter((point) => point.current);
		expect(current).toEqual([expect.objectContaining({ kind: "stage", stage: "Prototype" })]);
		expect(graph.signals).toHaveLength(0);
		expect(graph.rings.map((ring) => ring.name)).toEqual([
			"Ideation",
			"Prototype",
		]);
	});

	it("marks no current point on a dormant or cancelled project, but still ends its road", () => {
		for (const status of [ProjectStatus.Dormant, ProjectStatus.KilledWithDignity]) {
			const trail = toProjectTrail(row({ status }));
			if (!trail) throw new Error("no trail");
			const { points } = buildTrailsGraph([trail], { center: 0, now });
			expect(points.some((point) => point.current)).toBe(false);
			expect(points.filter((point) => point.end)).toEqual([
				expect.objectContaining({ kind: "stage", stage: "Prototype" }),
			]);
		}
	});

	it("leads a live project's current stage on, dashed, to the next ring", () => {
		const live = toProjectTrail(row());
		const dormant = toProjectTrail(row({ status: ProjectStatus.Dormant }));
		if (!live || !dormant) throw new Error("no trail");
		const graph = buildTrailsGraph([live, dormant], { center: 0, now });
		const ahead = graph.links.filter((link) => link.ahead === "stage");
		expect(ahead.map((link) => link.project)).toEqual([0]);
		expect(graph.points[ahead[0].source]).toMatchObject({ stage: "Prototype", current: true });
		expect(graph.points[ahead[0].target]).toMatchObject({ kind: "stageGoal", stage: "Prototype" });
	});

	it("spaces a stage's checkpoints evenly, an active last one taking half of what is left", () => {
		const trail = toProjectTrail(
			row({
				checkpoints: [
					checkpoint("s2", 1, CheckpointStatus.Closed),
					checkpoint("s2", 2, CheckpointStatus.Closed),
					checkpoint("s2", 3, CheckpointStatus.Active),
				],
			}),
		);
		if (!trail) throw new Error("no trail");
		const graph = buildTrailsGraph([trail], { center: 0, now });
		const distance = (kind: string) =>
			graph.points
				.filter((point) => point.kind === kind)
				.map((point) => Math.hypot(point.x, point.y));
		const [stageStart] = distance("stage").slice(-1);
		const [goal] = distance("stageGoal");
		const quarter = (goal - stageStart) / 4;
		const ends = [...distance("checkpoint"), ...distance("checkpointEnd")];
		ends.forEach((end, index) =>
			expect(end - stageStart).toBeCloseTo(quarter * (index + 1), 0),
		);
	});

	it("runs a signal from today to the end of an active checkpoint", () => {
		const path = toProjectTrail(
			row({ checkpoints: [checkpoint("s2", 1, CheckpointStatus.Active)] }),
		);
		if (!path) throw new Error("no path");
		const graph = buildTrailsGraph([path], { center: 0, now });
		const current = graph.points.filter((point) => point.current);
		expect(current.map((point) => point.kind)).toEqual(["now"]);

		const [signal] = graph.signals;
		expect(graph.points[signal.from].kind).toBe("now");
		expect(graph.points[signal.to].kind).toBe("checkpointEnd");
		expect(
			graph.links.filter((link) => link.ahead === "checkpoint").map((link) => [link.source, link.target]),
		).toEqual([[signal.from, signal.to]]);
		// The whole active checkpoint, walked and ahead, reads as one stretch.
		expect(
			graph.links
				.filter((link) => link.checkpoint)
				.map((link) => graph.points[link.target].kind),
		).toEqual(["now", "checkpointEnd"]);
	});

	it("makes each stage's band as wide as its weight", () => {
		const path = toProjectTrail(row());
		if (!path) throw new Error("no path");
		const [ideation, prototype] = buildTrailsGraph([path], {
			center: 0,
			now,
		}).rings.map((ring) => ring.radius);
		// Introduction is the centre: the first ring is where the next stage starts.
		expect(ideation).toBe(TRAILS_RING_STEP);
		expect(prototype - ideation).toBeCloseTo(
			TRAILS_RING_STEP * TRAILS_STAGE_WEIGHTS.ideation,
		);
	});

	it("links each project into one chain from the centre", () => {
		const paths = [row(), row({ id: "p2", workflow: { currentStepId: "s1", steps } })]
			.map(toProjectTrail)
			.flatMap((path) => path ?? []);
		const graph = buildTrailsGraph(paths, { center: 0, now });
		expect(graph.links.filter((link) => link.source === 0)).toHaveLength(2);
		expect(graph.links.filter((link) => link.project === 0)).toHaveLength(3);
		expect(graph.links.filter((link) => link.project === 1)).toHaveLength(2);
		expect(graph.points.some((point) => point.stage === "Introduction")).toBe(
			false,
		);
	});
});
