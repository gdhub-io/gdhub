import { CheckpointItemKind, CheckpointStatus } from "@gdhub-io/gdhub-prisma";
import { checkpointDay } from "@/lib/checkpoint-days";
import { settleVerdict, unprovenOutcomes } from "@/lib/checkpoint-verdict";
import { lastClosedOutcomes } from "@/repositories/checkpoint.repository";
import { CHECKPOINT_DAYS } from "@/schemas/checkpoint";
import type {
	CuratorGoalCard,
	CuratorLine,
	CuratorOptions,
	GoalCheckResult,
	SuggestLinesResult,
} from "@/services/checkpoint-curator";
import { checkpointCurator } from "@/services/checkpoint-curator";
import { prisma } from "@/services/prisma";

/**
 * The AI curator's four moments, each gathering its own facts and writing back
 * what came of it — and the suggestion the author asks for, which writes nothing.
 *
 * Every write here is idempotent: the cron may fire twice on a day, a retry may land
 * after a timeout, and none of it may produce two notes or two verdicts. What
 * has already been written is the guard, not a lock.
 *
 * They do not know which day it is — GDHUB-35's cron decides that. They only
 * refuse work that is already done.
 */

const curatorItemSelect = {
	id: true,
	kind: true,
	text: true,
	originalText: true,
	cut: true,
	addedAt: true,
	acceptedNote: true,
	artifact: {
		select: {
			type: true,
			name: true,
			description: true,
			link: true,
			checkStatus: true,
		},
	},
} as const;

/** Only what the goal card needs; the artifact fields are read off the row. */
type CardItem = {
	id: string;
	kind: CheckpointItemKind;
	text: string;
	originalText: string | null;
	cut: boolean;
	addedAt: Date | null;
};

const toLine = (item: CardItem): CuratorLine => ({
	id: item.id,
	text: item.text,
	originalText: item.originalText,
	cut: item.cut,
	addedAt: item.addedAt?.toISOString() ?? null,
});

const toCard = (goal: string, items: CardItem[]): CuratorGoalCard => ({
	goal,
	inputs: items
		.filter((item) => item.kind === CheckpointItemKind.Input)
		.map(toLine),
	outcomes: items
		.filter((item) => item.kind === CheckpointItemKind.Outcome)
		.map(toLine),
});

const toDevlog = (post: { publishedAt: Date; content: string }) => ({
	publishedAt: post.publishedAt.toISOString().slice(0, 10),
	content: post.content,
});

/** What the stage's template says it requires — the required tasks, by name. */
const stageRequirements = async (stepId: string | null) => {
	if (!stepId) return [];

	const tasks = await prisma.projectWorkflowTask.findMany({
		where: { stepId, required: true },
		orderBy: { order: "asc" },
		select: { name: true },
	});

	return tasks.flatMap((task) => (task.name ? [task.name] : []));
};

/**
 * Day 1: read the card back and say what will not fit.
 *
 * Nothing is written. The concerns are what the author is shown while the card
 * can still change, and once it is agreed they are history — the record keeps
 * `originalText`, which is the part that still matters at the end.
 */
export const runGoalCheck = async (
	checkpointId: string,
	options: CuratorOptions = {},
): Promise<GoalCheckResult | null> => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			goal: true,
			stageName: true,
			stepId: true,
			items: { select: curatorItemSelect, orderBy: { order: "asc" } },
		},
	});

	if (!checkpoint) return null;

	return checkpointCurator.checkGoal(
		{
			card: toCard(checkpoint.goal, checkpoint.items),
			stage: {
				name: checkpoint.stageName,
				requirements: await stageRequirements(checkpoint.stepId),
			},
		},
		options,
	);
};

/**
 * Lines for one side of the card, for an author who does not know what to write.
 *
 * It suggests and nothing more: nothing is written, and which side is asked for
 * decides what the model sees — outcomes are proposed against the goal and what
 * the project already has, inputs against the project itself and what the last
 * checkpoint left behind.
 */
export const suggestCardLines = async (
	checkpointId: string,
	kind: CheckpointItemKind,
	options: CuratorOptions = {},
): Promise<SuggestLinesResult | null> => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			goal: true,
			projectId: true,
			stageName: true,
			stepId: true,
			project: { select: { name: true, description: true } },
			items: { select: curatorItemSelect, orderBy: { order: "asc" } },
		},
	});

	if (!checkpoint) return null;

	const stage = {
		name: checkpoint.stageName,
		requirements: await stageRequirements(checkpoint.stepId),
	};

	if (kind === CheckpointItemKind.Outcome) {
		const card = toCard(checkpoint.goal, checkpoint.items);

		return checkpointCurator.suggestLines(
			{
				kind: CheckpointItemKind.Outcome,
				goal: card.goal,
				inputs: card.inputs.map((item) => item.text),
				stage,
			},
			options,
		);
	}

	const previous = await lastClosedOutcomes(checkpoint.projectId);

	return checkpointCurator.suggestLines(
		{
			kind: CheckpointItemKind.Input,
			project: checkpoint.project,
			stage,
			previousOutcomes: previous.map((item) => item.text),
		},
		options,
	);
};

/**
 * The answer under one devlog, written the day after it was posted.
 *
 * Returns null and writes nothing when the post already carries an answer, when
 * it belongs to no checkpoint, or when the model failed — a devlog with no
 * curator answer is a devlog, and the author loses nothing.
 */
export const answerDevlog = async (
	reportId: string,
	options: CuratorOptions = {},
) => {
	const report = await prisma.projectReport.findUnique({
		where: { id: reportId },
		select: {
			content: true,
			video: true,
			publishedAt: true,
			curatorFeedbackAt: true,
			checkpoint: {
				select: {
					goal: true,
					items: { select: curatorItemSelect, orderBy: { order: "asc" } },
				},
			},
		},
	});

	if (!report?.checkpoint || report.curatorFeedbackAt) return null;

	const answer = await checkpointCurator.answerDevlog(
		{
			devlog: {
				publishedAt: report.publishedAt.toISOString().slice(0, 10),
				content: report.content,
				hasVideo: !!report.video,
			},
			outcomes: toCard(
				report.checkpoint.goal,
				report.checkpoint.items,
			).outcomes.filter((item) => !item.cut),
		},
		options,
	);

	if (!answer) return null;

	await prisma.projectReport.update({
		where: { id: reportId },
		data: { curatorFeedback: answer.answer, curatorFeedbackAt: new Date() },
	});

	return answer;
};

/**
 * Day 14: name the outcomes nothing has been claimed against and ask the author
 * to decide. Which outcomes those are is computed here, not asked of the model.
 */
export const writeMidNote = async (
	checkpointId: string,
	options: CuratorOptions = {},
) => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			goal: true,
			midNote: true,
			startedAt: true,
			status: true,
			items: { select: curatorItemSelect, orderBy: { order: "asc" } },
			reports: {
				orderBy: { publishedAt: "asc" },
				select: { publishedAt: true, content: true },
			},
		},
	});

	if (
		!checkpoint ||
		checkpoint.midNote ||
		checkpoint.status !== CheckpointStatus.Active ||
		!checkpoint.startedAt
	) {
		return null;
	}

	const items = checkpoint.items;
	const written = await checkpointCurator.writeMidNote(
		{
			card: toCard(checkpoint.goal, items),
			unproven: unprovenOutcomes(items),
			day: checkpointDay(checkpoint.startedAt),
			devlogs: checkpoint.reports.map(toDevlog),
		},
		options,
	);

	if (!written) return null;

	await prisma.projectCheckpoint.update({
		where: { id: checkpointId },
		data: { midNote: written.note },
	});

	return written;
};

/**
 * Day 28: the report, the verdict, and the end of the checkpoint.
 *
 * Fails closed. A model that errors or answers nothing usable leaves the
 * checkpoint in `Review` for the next run — closing one on a shrug would write a
 * verdict nobody wrote and move a project's stage on it.
 */
export const closeCheckpoint = async (
	checkpointId: string,
	options: CuratorOptions = {},
) => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			goal: true,
			stageName: true,
			stepId: true,
			status: true,
			verdict: true,
			revisedAt: true,
			revisedNote: true,
			items: { select: curatorItemSelect, orderBy: { order: "asc" } },
			reports: {
				orderBy: { publishedAt: "asc" },
				select: { publishedAt: true, content: true },
			},
			pulses: {
				select: {
					week: true,
					confirmedAt: true,
					teamMember: { select: { user: { select: { name: true } } } },
				},
			},
		},
	});

	if (!checkpoint || checkpoint.verdict) return null;
	if (
		checkpoint.status !== CheckpointStatus.Active &&
		checkpoint.status !== CheckpointStatus.Review
	) {
		return null;
	}

	const items = checkpoint.items;
	const unproven = unprovenOutcomes(items);

	const proposed = await checkpointCurator.writeReport(
		{
			card: toCard(checkpoint.goal, items),
			stage: {
				name: checkpoint.stageName,
				requirements: await stageRequirements(checkpoint.stepId),
			},
			revision: checkpoint.revisedAt
				? {
						revisedAt: checkpoint.revisedAt.toISOString().slice(0, 10),
						note: checkpoint.revisedNote,
					}
				: null,
			artifacts: items.flatMap((item) =>
				item.artifact
					? [
							{
								itemId: item.id,
								type: item.artifact.type,
								name: item.artifact.name,
								description: item.artifact.description,
								link: item.artifact.link,
								readable: item.artifact.checkStatus === "Readable",
							},
						]
					: [],
			),
			unproven,
			devlogs: checkpoint.reports.map(toDevlog),
			pulses: pulseMatrix(checkpoint.pulses),
		},
		options,
	);

	if (!proposed) return null;

	const settled = settleVerdict(items, proposed.verdict);

	if (settled.overrode) {
		// Worth knowing: the model read the same evidence and disagreed with it.
		console.warn(
			`[checkpoint-curator] guardrail overruled ${settled.overrode} on ${checkpointId}: ${settled.unproven.length} outcome(s) unproven`,
		);
	}

	await prisma.projectCheckpoint.update({
		where: { id: checkpointId },
		data: {
			status: CheckpointStatus.Closed,
			summary: proposed.summary,
			verdict: settled.verdict,
			verdictNote: proposed.verdictNote,
			decidedAt: new Date(),
		},
	});

	return settled;
};

type PulseRow = {
	week: number;
	confirmedAt: Date | null;
	teamMember: { user: { name: string | null } };
};

/** Member by week, in the shape the report reads: four booleans per person. */
const pulseMatrix = (pulses: PulseRow[]) => {
	const weeks = CHECKPOINT_DAYS / 7;
	const byMember = new Map<string, boolean[]>();

	for (const pulse of pulses) {
		const member = pulse.teamMember.user.name ?? "Unnamed";
		const row = byMember.get(member) ?? Array<boolean>(weeks).fill(false);
		row[pulse.week - 1] = !!pulse.confirmedAt;
		byMember.set(member, row);
	}

	return [...byMember].map(([member, weeks]) => ({ member, weeks }));
};
