import { createHash } from "node:crypto";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointJournalKind,
	CheckpointSessionContentStatus,
	CheckpointStatus,
	type CheckpointVerdict,
	Prisma,
	TeamMemberStatus,
} from "@gdhub-io/gdhub-prisma";
import { SPRINTS_PER_CHECKPOINT } from "@/config/checkpoint";
import { checkpointDay } from "@/lib/checkpoint-days";
import {
	settleVerdict,
	type VerdictItem,
	weighOutcomes,
} from "@/lib/checkpoint-verdict";
import { recheckCheckpointArtifacts } from "@/repositories/artifact-check";
import { lastClosedOutcomes } from "@/repositories/checkpoint.repository";
import {
	briefAuthor,
	briefMemberSelect,
	lastVerdict,
} from "@/repositories/checkpoint-brief";
import {
	curatorTeam,
	projectPicture,
	runPeriod,
	stageWorkflow,
} from "@/repositories/curator-context";
import { journal } from "@/repositories/curator-journal";
import { seeCheckpointEvidence } from "@/repositories/evidence-seen";
import { CONFIRMED_MEMBERS } from "@/repositories/scout.games";
import { issueCheckpointCertificate } from "@/services/certificates";
import { closeCheckpointRoom, syncChat } from "@/services/chat/checkpoint-room";
import type {
	CuratorGoalCard,
	CuratorLine,
	CuratorOptions,
	GoalCheckInput,
	GoalCheckResult,
	SuggestLinesResult,
} from "@/services/checkpoint-curator";
import { checkpointCurator } from "@/services/checkpoint-curator";
import { notifyDayOne } from "@/services/checkpoint-notifications";
import { prisma } from "@/services/prisma";
import type {
	CallNotes,
	CuratorReview,
	VerdictContextDto,
} from "@/types/checkpoints";

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
	evidenceMatch: true,
	evidenceMatchNote: true,
	artifact: {
		select: {
			type: true,
			name: true,
			description: true,
			link: true,
			checkStatus: true,
			checkNote: true,
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

type ReportItem = CardItem &
	VerdictItem & {
		artifact:
			| (NonNullable<VerdictItem["artifact"]> & {
					type: string;
					name: string | null;
					description: string | null;
					link: string;
			  })
			| null;
	};

/**
 * The card and what its evidence came to, as the report reads them. Pure, so
 * the AI curator lab builds the same input from a prepared situation.
 */
export const reportEvidence = (goal: string, items: ReportItem[]) => ({
	card: toCard(goal, items),
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
						seen: item.evidenceMatch
							? {
									match: item.evidenceMatch,
									note: item.evidenceMatchNote ?? null,
								}
							: null,
					},
				]
			: [],
	),
	...weighOutcomes(items),
});

/**
 * What a stored read answers: everything the model is given and nothing else.
 * A card edited back to what it was hashes the same and costs no second call.
 */
export const goalCheckHash = ({ picture: _, ...input }: GoalCheckInput) =>
	// The picture carries today's date and the latest activity: it informs the
	// read but does not make the same card worth paying for twice.
	createHash("sha256")
		.update(JSON.stringify(input))
		.digest("hex");

/**
 * Day 1: read the card back and say what will not fit.
 *
 * The read is kept on the checkpoint and returned again while the plan behind it
 * is unchanged: the payment step is the only caller and would otherwise spend a
 * model call on every load. One read, overwritten — what is wanted later is what
 * the author paid against, not every version they passed through.
 *
 * The card itself is not written. The concerns are what the author is shown while
 * it can still change, and once it is agreed they are history — the record keeps
 * `originalText`, which is the part that still matters at the end.
 */
export const runGoalCheck = async (
	checkpointId: string,
	options: CuratorOptions = {},
): Promise<GoalCheckResult | null> => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			projectId: true,
			goal: true,
			stageName: true,
			stepId: true,
			goalCheck: true,
			goalCheckHash: true,
			items: { select: curatorItemSelect, orderBy: { order: "asc" } },
			project: {
				select: {
					name: true,
					description: true,
					genre: true,
					team: {
						select: {
							members: {
								// The team as it stands, as the curator's card counts it.
								where: CONFIRMED_MEMBERS,
								select: { status: true, ...briefMemberSelect },
							},
						},
					},
				},
			},
		},
	});

	if (!checkpoint) return null;

	const members = checkpoint.project?.team?.members ?? [];
	const [previous, workflow] = await Promise.all([
		lastVerdict(checkpoint.projectId, checkpointId),
		stageWorkflow(checkpoint.stepId, checkpoint.stageName),
	]);

	const founder = members.find(
		(member) => member.status === TeamMemberStatus.Founder,
	);

	const input: GoalCheckInput = {
		card: toCard(checkpoint.goal, checkpoint.items),
		workflow,
		project: {
			name: checkpoint.project.name,
			pitch: checkpoint.project.description?.trim() || null,
			genre: checkpoint.project.genre?.trim() || null,
		},
		author: founder ? briefAuthor(founder) : null,
		team: await curatorTeam(checkpointId, checkpoint.projectId),
		previous,
		picture: await projectPicture(checkpointId),
	};

	const hash = goalCheckHash(input);

	if (checkpoint.goalCheck && checkpoint.goalCheckHash === hash) {
		// The package's JSON type predates the notes' advice shape; a read kept
		// before it was asked of an older input, so its hash never matches here.
		return checkpoint.goalCheck as GoalCheckResult;
	}

	const result = await checkpointCurator.checkGoal(input, {
		...options,
		checkpointId,
	});
	if (!result) return null;

	await prisma.projectCheckpoint.update({
		where: { id: checkpointId },
		data: { goalCheck: result, goalCheckHash: hash },
	});

	return result;
};

/**
 * Day 1 with the AI curator (GDHUB-117): once the checkpoint is paid, the
 * curator reads the goal and writes the first letter — the plan looks good, or
 * what to change — and the author hears they have until the goal and tasks
 * lock. Written once: a second webhook finds the letter there. A read that
 * fails leaves the letter to the review page, which greets on first open.
 */
export const writeFirstLetter = async (checkpointId: string) => {
	const session = await prisma.checkpointSession.findFirst({
		where: { checkpointId, index: 1 },
		select: { id: true, content: true },
	});
	if (!session || session.content) return;

	const read = await runGoalCheck(checkpointId).catch((error) => {
		console.error(
			"[checkpoint-curator] first letter failed",
			checkpointId,
			error,
		);
		return null;
	});
	if (read) {
		await prisma.checkpointSession.updateMany({
			where: { id: session.id, content: { equals: Prisma.AnyNull } },
			data: {
				content: {
					message: read.note,
					notes: null,
					// The read's notes under each task, as the plan advice shows them.
					advice: read.notes.length
						? { tasks: read.notes, add: read.missing, hash: "first-letter" }
						: null,
				} satisfies CuratorReview,
				contentStatus: CheckpointSessionContentStatus.Ready,
			},
		});
	}
	await notifyDayOne(checkpointId, !!read);
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

	const workflow = await stageWorkflow(checkpoint.stepId, checkpoint.stageName);

	if (kind === CheckpointItemKind.Outcome) {
		const card = toCard(checkpoint.goal, checkpoint.items);

		return checkpointCurator.suggestLines(
			{
				kind: CheckpointItemKind.Outcome,
				goal: card.goal,
				inputs: card.inputs.map((item) => item.text),
				workflow,
			},
			{ ...options, checkpointId },
		);
	}

	const previous = await lastClosedOutcomes(checkpoint.projectId);

	return checkpointCurator.suggestLines(
		{
			kind: CheckpointItemKind.Input,
			project: checkpoint.project,
			workflow,
			previousOutcomes: previous.map((item) => item.text),
		},
		{ ...options, checkpointId },
	);
};

/**
 * Day 15: name the outcomes nothing has been claimed against and ask the author
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
			unproven: weighOutcomes(items).unproven,
			day: checkpointDay(checkpoint.startedAt),
			devlogs: checkpoint.reports.map(toDevlog),
			picture: await projectPicture(checkpointId, {
				from: checkpoint.startedAt,
				to: new Date(),
			}),
		},
		{ ...options, checkpointId },
	);

	if (!written) return null;

	await prisma.projectCheckpoint.update({
		where: { id: checkpointId },
		data: { midNote: written.note },
	});

	return written;
};

/**
 * What the day-28 report reads: the card, the evidence as it opens today and
 * what it shows, the devlogs, the pulse — and, on a human curator's checkpoint,
 * what each call agreed. The AI curator's verdict and the human curator's AI
 * read (GDHUB-114) are written from the same input.
 */
const reportInputFor = async (checkpointId: string) => {
	// The verdict counts only evidence that opens today, not on the day it was added,
	// and the report says what that evidence shows.
	await recheckCheckpointArtifacts(checkpointId);
	await seeCheckpointEvidence(checkpointId);

	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			projectId: true,
			goal: true,
			stageName: true,
			stepId: true,
			revisedAt: true,
			revisedNote: true,
			startedAt: true,
			dueAt: true,
			curatorKind: true,
			items: { select: curatorItemSelect, orderBy: { order: "asc" } },
			sessions: {
				where: { content: { not: Prisma.AnyNull } },
				orderBy: { index: "asc" },
				select: { index: true, content: true },
			},
			reports: {
				orderBy: { publishedAt: "asc" },
				select: { publishedAt: true, content: true },
			},
		},
	});
	if (!checkpoint) return null;

	const items = checkpoint.items;

	const reportInput = {
		...reportEvidence(checkpoint.goal, items),
		workflow: await stageWorkflow(checkpoint.stepId, checkpoint.stageName),
		revision: checkpoint.revisedAt
			? {
					revisedAt: checkpoint.revisedAt.toISOString().slice(0, 10),
					note: checkpoint.revisedNote,
				}
			: null,
		devlogs: checkpoint.reports.map(toDevlog),
		team: await curatorTeam(checkpointId, checkpoint.projectId),
		calls:
			checkpoint.curatorKind === CheckpointCuratorKind.Human
				? checkpoint.sessions.map((session) => {
						const notes = session.content as CallNotes;
						return {
							index: session.index,
							inShort: notes.inShort,
							agreed: notes.agreed.map((line) => line.text),
						};
					})
				: [],
		picture: await projectPicture(
			checkpointId,
			runPeriod(checkpoint.startedAt ?? new Date(), checkpoint.dueAt),
		),
	};
	return { items, reportInput };
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
	const open = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: { status: true, verdict: true },
	});
	if (!open || open.verdict) return null;
	if (
		open.status !== CheckpointStatus.Active &&
		open.status !== CheckpointStatus.Review
	) {
		return null;
	}

	const read = await reportInputFor(checkpointId);
	if (!read) return null;
	const { items, reportInput } = read;

	const proposed = await checkpointCurator.writeReport(reportInput, {
		...options,
		checkpointId,
	});

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

	await journal({
		checkpointId,
		kind: CheckpointJournalKind.Review,
		sprint: SPRINTS_PER_CHECKPOINT,
		input: reportInput,
		output: proposed,
	});
	await journal({
		checkpointId,
		kind: CheckpointJournalKind.Verdict,
		sprint: SPRINTS_PER_CHECKPOINT,
		output: {
			by: "ai",
			proposed: proposed.verdict,
			settled: settled.verdict,
			overrode: settled.overrode,
			unproven: settled.unproven,
			trusted: settled.trusted,
			partly: settled.partly,
		},
	});

	await Promise.all([
		syncChat(`close ${checkpointId}`, () => closeCheckpointRoom(checkpointId)),
		issueCheckpointCertificate(checkpointId).catch((error) =>
			console.error(`[certificate] checkpoint ${checkpointId}`, error),
		),
	]);

	return settled;
};

/**
 * Day 29 of a human curator's checkpoint (GDHUB-114): the verdict the AI would
 * propose, why, and the outcomes no artifact proves — a reference beside the
 * curator's own, empty fields. Nothing is decided or sent. Written once.
 */
export const writeVerdictRead = async (checkpointId: string) => {
	const written = await prisma.checkpointJournalEntry.findFirst({
		where: { checkpointId, kind: CheckpointJournalKind.Verdict },
		select: { id: true },
	});
	if (written) return false;

	const read = await reportInputFor(checkpointId);
	if (!read) return false;
	const proposed = await checkpointCurator.writeReport(read.reportInput, {
		checkpointId,
		purpose: "verdictRead",
	});
	if (!proposed) return false;

	await journal({
		checkpointId,
		kind: CheckpointJournalKind.Verdict,
		sprint: SPRINTS_PER_CHECKPOINT,
		input: read.reportInput,
		output: {
			by: "ai",
			proposed: proposed.verdict,
			settled: null,
			note: proposed.verdictNote,
			summary: proposed.summary,
			unproven: read.reportInput.unproven,
			// What the verdict window shows, so it never reads the input.
			evidence: read.reportInput.artifacts.flatMap((artifact) =>
				artifact.seen
					? [
							{
								name: artifact.name ?? artifact.link,
								match: artifact.seen.match,
								note: artifact.seen.note,
							},
						]
					: [],
			),
		},
	});
	return true;
};

/** Every human checkpoint waiting for its verdict that has no AI read yet. */
export const writeDueVerdictReads = async () => {
	const due = await prisma.projectCheckpoint.findMany({
		where: {
			curatorKind: CheckpointCuratorKind.Human,
			status: CheckpointStatus.Review,
			verdict: null,
			journal: { none: { kind: CheckpointJournalKind.Verdict } },
		},
		select: { id: true },
	});

	let written = 0;
	for (const { id } of due) {
		const ok = await writeVerdictRead(id).catch((error) => {
			console.error("[verdict-read] failed for checkpoint", id, error);
			return false;
		});
		if (ok) written += 1;
	}
	return written;
};

export type VerdictRead = NonNullable<VerdictContextDto["aiRead"]>;

/** The AI's read of a human checkpoint's verdict — its first Verdict line. Curator and admins only. */
export const getVerdictRead = async (
	checkpointId: string,
): Promise<VerdictRead | null> => {
	const entry = await prisma.checkpointJournalEntry.findFirst({
		where: {
			checkpointId,
			kind: CheckpointJournalKind.Verdict,
			checkpoint: { curatorKind: CheckpointCuratorKind.Human },
		},
		orderBy: { createdAt: "asc" },
		select: { output: true, createdAt: true },
	});
	if (!entry) return null;
	return {
		...(entry.output as Omit<VerdictRead, "writtenAt">),
		writtenAt: entry.createdAt.toISOString(),
	};
};

/** The curator's sent verdict beside what the AI proposed, so admins see where they part. */
export const journalCuratorVerdict = async (
	checkpointId: string,
	verdict: CheckpointVerdict,
	note: string,
) => {
	const read = await prisma.checkpointJournalEntry.findFirst({
		where: { checkpointId, kind: CheckpointJournalKind.Verdict },
		orderBy: { createdAt: "asc" },
		select: { output: true },
	});
	await journal({
		checkpointId,
		kind: CheckpointJournalKind.Verdict,
		sprint: SPRINTS_PER_CHECKPOINT,
		output: {
			proposed:
				(read?.output as { proposed?: CheckpointVerdict } | undefined)
					?.proposed ?? null,
			by: "curator",
			settled: verdict,
			note,
		},
	});
};
