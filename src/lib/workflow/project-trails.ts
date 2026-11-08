import { CHECKPOINT_DAYS } from "@/config/checkpoint";
import { CheckpointStatus, ProjectStatus } from "@/config/prisma-enums";
import {
	TRAILS_MAX_SWAY,
	TRAILS_RING_DOT_SPACING,
	TRAILS_RING_STEP,
	TRAILS_STAGE_WEIGHTS,
} from "@/config/project-trails";
import { checkpointProgress } from "@/lib/checkpoints/days";
import { matchKey } from "@/lib/workflow/matchKey";
import type {
	ProjectTrailCheckpointDto,
	ProjectTrailCheckpointStatus,
	ProjectTrailDto,
	ProjectTrailStatus,
} from "@/types/project-trails";

/** Statuses on the graph; unmoderated, rejected and archived projects stay off it. */
export const TRAIL_STATUS_BY_PROJECT_STATUS: Partial<
	Record<ProjectStatus, ProjectTrailStatus>
> = {
	[ProjectStatus.Approved]: "inProgress",
	[ProjectStatus.Released]: "released",
	[ProjectStatus.Dormant]: "abandoned",
	[ProjectStatus.KilledWithDignity]: "cancelled",
};

/** Checkpoints that ran; drafts, unaccepted and cancelled ones never moved the project. */
export const TRAIL_STATUS_BY_CHECKPOINT_STATUS: Partial<
	Record<CheckpointStatus, ProjectTrailCheckpointStatus>
> = {
	[CheckpointStatus.Active]: "active",
	[CheckpointStatus.Review]: "review",
	[CheckpointStatus.Closed]: "closed",
};

export type ProjectTrailRow = {
	id: string;
	slug: string;
	name: string;
	coverImage: string | null;
	status: ProjectStatus;
	workflow: {
		currentStepId: string | null;
		steps: { id: string; order: number; name: string; done: boolean }[];
	} | null;
	checkpoints: {
		stepId: string | null;
		order: number;
		status: CheckpointStatus;
		startedAt: Date | null;
	}[];
};

/**
 * The stages from the first to the current one. A project with no current stage
 * stands on its last finished one, or on the first if it finished none.
 * Introduction is the centre every road leaves from, not a stage on it: it is
 * dropped by name wherever the workflow has it, and a project still on it — or
 * on its first stage — has no road yet and is left out.
 */
export const toProjectTrail = (
	row: ProjectTrailRow,
): Omit<ProjectTrailDto, "score"> | null => {
	const status = TRAIL_STATUS_BY_PROJECT_STATUS[row.status];
	const steps = [...(row.workflow?.steps ?? [])].sort(
		(a, b) => a.order - b.order,
	);
	if (!status || !steps.length) return null;

	let currentIndex = steps.findIndex(
		(step) => step.id === row.workflow?.currentStepId,
	);
	if (currentIndex < 0)
		currentIndex = Math.max(
			steps.findLastIndex((step) => step.done),
			0,
		);

	const isIntroduction = (step: { name: string }) =>
		matchKey(step.name) === INTRODUCTION;
	if (currentIndex === 0 || isIntroduction(steps[currentIndex])) return null;

	return {
		id: row.id,
		slug: row.slug,
		name: row.name,
		coverImage: row.coverImage,
		status,
		stageCount: steps.length,
		nextStage: steps[currentIndex + 1]?.name ?? null,
		stages: steps
			.slice(0, currentIndex + 1)
			.map((step, index) => ({ step, number: index + 1 }))
			.filter(({ step }) => !isIntroduction(step))
			.map(({ step, number }) => ({
				name: step.name,
				number,
				checkpoints: row.checkpoints
					.filter((checkpoint) => checkpoint.stepId === step.id)
					.flatMap((checkpoint): ProjectTrailCheckpointDto[] => {
						const checkpointStatus =
							TRAIL_STATUS_BY_CHECKPOINT_STATUS[checkpoint.status];
						if (!checkpointStatus) return [];
						return [
							{
								order: checkpoint.order,
								status: checkpointStatus,
								startedAt: checkpoint.startedAt?.toISOString() ?? null,
							},
						];
					})
					.sort((a, b) => a.order - b.order),
			})),
	};
};

const INTRODUCTION = matchKey("Introduction");

/** Share of an active checkpoint's 28 days already behind it, 0..1, counted as the checkpoint pages count. */
const checkpointShare = (startedAt: string | null, now: Date) => {
	const { day } = checkpointProgress(
		startedAt ? new Date(startedAt) : null,
		now,
	);
	return day ? (day - 1) / CHECKPOINT_DAYS : 0;
};

type TrailPointKind =
	| "origin"
	| "ring"
	| "stage"
	| "checkpoint"
	| "now"
	| "checkpointEnd"
	| "signal"
	/** Where the current stage will be done: the next ring, still ahead. */
	| "stageGoal";

export type TrailPoint = {
	kind: TrailPointKind;
	x: number;
	y: number;
	/** Index into the paths array; absent on the origin and the ring dots. */
	project?: number;
	stage?: string;
	/** Index of `stage` in the project's stages. */
	stageIndex?: number;
	checkpoint?: ProjectTrailCheckpointDto;
	/** The point the project stands on now. */
	current?: boolean;
	/** The point the road ends on, live or not. */
	end?: boolean;
};

type TrailLink = {
	source: number;
	target: number;
	project: number;
	/** A stretch still ahead, drawn dashed: of an active checkpoint, or of the current stage. */
	ahead?: "checkpoint" | "stage";
	/** Part of an active checkpoint, walked or ahead: drawn in the checkpoint's colour. */
	checkpoint?: boolean;
};

type TrailSignal = { point: number; from: number; to: number };

export type TrailsGraph = {
	points: TrailPoint[];
	links: TrailLink[];
	signals: TrailSignal[];
	/** The most common stage name on each ring, from the centre outwards */
	rings: { name: string; radius: number }[];
};

const stageWeight = (name: string) => TRAILS_STAGE_WEIGHTS[matchKey(name)] ?? 1;

// A stable 0..1 per project, so a path keeps its sway between visits.
const unitHash = (value: string) => {
	let hash = 2166136261;
	for (let i = 0; i < value.length; i++) {
		hash ^= value.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0) / 4294967295;
};

const mostCommon = (names: string[]) => {
	const counts = new Map<string, number>();
	for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
	return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
};

/**
 * Every project leaves the centre on its own heading. Stage `k` sits on ring
 * `k + 1`, and the band from it to the next ring is as wide as the stage
 * usually lasts. A stage's checkpoints fill its band, one slot each, and an
 * active one is split where it stands today: walked behind, dashed ahead, with a
 * signal running the dashed part.
 */
export const buildTrailsGraph = (
	paths: Pick<ProjectTrailDto, "id" | "status" | "stages">[],
	{ center, now }: { center: number; now: Date },
): TrailsGraph => {
	const points: TrailPoint[] = [{ kind: "origin", x: center, y: center }];
	const links: TrailLink[] = [];
	const signals: TrailSignal[] = [];
	const depth = Math.max(0, ...paths.map((path) => path.stages.length));
	const names = Array.from({ length: depth }, (_, index) =>
		mostCommon(
			paths.flatMap((path) =>
				path.stages[index] ? [path.stages[index].name] : [],
			),
		),
	);
	// Ring 0 is the centre; ring k + 1 starts where stage k's band ends.
	const bounds = [0, TRAILS_RING_STEP];
	for (const name of names)
		bounds.push(
			bounds[bounds.length - 1] + TRAILS_RING_STEP * stageWeight(name),
		);
	const radiusAt = (ring: number) => {
		const inner = Math.min(Math.floor(ring), bounds.length - 1);
		const outer = Math.min(inner + 1, bounds.length - 1);
		return bounds[inner] + (bounds[outer] - bounds[inner]) * (ring - inner);
	};

	const sway = Math.min(
		TRAILS_MAX_SWAY,
		(Math.PI / Math.max(paths.length, 1)) * 0.45,
	);

	paths.forEach((path, project) => {
		const heading = (2 * Math.PI * project) / paths.length - Math.PI / 2;
		const phase = unitHash(path.id) * 2 * Math.PI;
		// The radius in rings, turned into a point that drifts gently around its heading.
		const at = (ring: number) => {
			const angle = heading + sway * Math.sin(ring * 0.9 + phase);
			const radius = radiusAt(ring);
			return {
				x: center + radius * Math.cos(angle),
				y: center + radius * Math.sin(angle),
			};
		};
		const add = (
			point: Omit<TrailPoint, "x" | "y" | "project">,
			ring: number,
		) => {
			points.push({ ...point, ...at(ring), project });
			return points.length - 1;
		};
		const link = (
			source: number,
			target: number,
			ahead?: TrailLink["ahead"],
			checkpoint?: boolean,
		) => links.push({ source, target, project, ahead, checkpoint });

		// Only a project still moving is marked where it stands; a dormant or cancelled road just ends.
		const live = path.status === "inProgress" || path.status === "released";
		let previous = 0;
		path.stages.forEach((stage, index) => {
			const ring = index + 1;
			const isCurrentStage = index === path.stages.length - 1;
			const stagePoint = add(
				{ kind: "stage", stage: stage.name, stageIndex: index },
				ring,
			);
			link(previous, stagePoint);
			previous = stagePoint;

			// n checkpoints cut the band into n + 1 equal parts, so an active last one covers half of what is left.
			const slot = 1 / (stage.checkpoints.length + 1);
			let standsOnCheckpoint = false;
			stage.checkpoints.forEach((checkpoint, slotIndex) => {
				const startRing = ring + slot * slotIndex;
				const endRing = startRing + slot;
				const meta = { stage: stage.name, stageIndex: index, checkpoint };

				if (checkpoint.status !== "active") {
					const end = add({ kind: "checkpoint", ...meta }, endRing);
					link(previous, end);
					previous = end;
					return;
				}

				const nowRing =
					startRing + slot * checkpointShare(checkpoint.startedAt, now);
				const nowPoint = add(
					{ kind: "now", ...meta, current: live, end: true },
					nowRing,
				);
				const end = add({ kind: "checkpointEnd", ...meta }, endRing);
				const signal = add({ kind: "signal", ...meta }, nowRing);
				link(previous, nowPoint, undefined, true);
				link(nowPoint, end, "checkpoint", true);
				signals.push({ point: signal, from: nowPoint, to: end });
				previous = end;
				standsOnCheckpoint = true;
			});

			if (isCurrentStage && !standsOnCheckpoint)
				Object.assign(points[stagePoint], { current: live, end: true });
			// A stage is named for what it works towards, so a live project is still on its way to the next ring.
			if (isCurrentStage && live)
				link(
					previous,
					add(
						{ kind: "stageGoal", stage: stage.name, stageIndex: index },
						ring + 1,
					),
					"stage",
				);
		});
	});

	const rings = names.map((name, index) => ({
		name,
		radius: bounds[index + 1],
	}));

	for (const { radius } of rings) {
		const dots = Math.round((2 * Math.PI * radius) / TRAILS_RING_DOT_SPACING);
		for (let i = 0; i < dots; i++) {
			const angle = (2 * Math.PI * i) / dots;
			points.push({
				kind: "ring",
				x: center + radius * Math.cos(angle),
				y: center + radius * Math.sin(angle),
			});
		}
	}

	return { points, links, signals, rings };
};
