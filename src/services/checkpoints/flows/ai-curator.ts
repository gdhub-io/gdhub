import {
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointJournalKind,
	CheckpointSessionContentStatus,
	CheckpointStatus,
	Prisma,
	TeamMemberStatus,
} from "@gdhub-io/gdhub-prisma";
import {
	DAY_ONE_DEVLOG_CHARS,
	SPRINTS_PER_CHECKPOINT,
} from "@/config/checkpoint";
import { lettersSoFar } from "@/lib/checkpoints/curator-letters";
import { devlogsWithin, devlogText } from "@/lib/checkpoints/curator-text";
import { renderDifference } from "@/lib/checkpoints/picture";
import { reviewOnLabel } from "@/lib/checkpoints/plan";
import {
	CHECKPOINT_RUNNING_STATUSES,
	checkpointMove,
} from "@/lib/checkpoints/status";
import { settleVerdict } from "@/lib/checkpoints/verdict";
import {
	curatorItemSelect,
	goalCheckHash,
	reportEvidence,
	toCard,
	toDevlog,
} from "@/repositories/checkpoints/ai-curator";
import {
	checkpointFacts,
	curatorPersona,
	runPeriod,
} from "@/repositories/checkpoints/ai-curator-context";
import {
	briefAuthor,
	briefMemberSelect,
	lastVerdict,
} from "@/repositories/checkpoints/brief";
import {
	type DayOneDevlog,
	dayOneDevlogs,
} from "@/repositories/checkpoints/day-one";
import { journal } from "@/repositories/checkpoints/journal";
import { runChangeOf } from "@/repositories/checkpoints/picture";
import { recheckCheckpointArtifacts } from "@/repositories/project/artifact-check";
import { CONFIRMED_MEMBERS } from "@/repositories/project/team";
import { issueCheckpointCertificate } from "@/services/certificates";
import { closeCheckpointRoom, syncChat } from "@/services/chat/checkpoint-room";
import {
	type CuratorOptions,
	checkpointCurator,
	type GoalCheckInput,
	type GoalCheckResult,
	type ReportInput,
	type ReportResult,
} from "@/services/checkpoints/ai-curator";
import { createCharacter } from "@/services/checkpoints/ai-curator/character";
import { composePlanLetter } from "@/services/checkpoints/ai-curator/plan-letter";
import {
	lookedArtifactLines,
	lookedMediaLines,
	seeCheckpointEvidence,
} from "@/services/checkpoints/flows/evidence-seen";
import { notifyDayOne } from "@/services/checkpoints/notifications";
import { prisma } from "@/services/prisma";
import type { CallNotes, CuratorReview } from "@/types/checkpoints";

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
	const read = await goalCheckInputOf(checkpointId);
	if (!read) return null;
	const { checkpoint, input } = read;

	const hash = goalCheckHash(input);

	if (checkpoint.goalCheck && checkpoint.goalCheckHash === hash) {
		return checkpoint.goalCheck;
	}

	const result = await checkpointCurator.checkGoal(input, {
		...options,
		checkpointId,
	});
	if (!result) return null;

	await prisma.projectCheckpoint.update({
		where: { id: checkpointId },
		data: {
			goalCheck: result,
			goalCheckHash: hash,
		},
	});

	return result;
};

/**
 * What the goal check reads — the compute half of `runGoalCheck`, nothing
 * written. A rebuild of day one (GDHUB-156) passes the devlogs it loaded and
 * the lines it has just seen in place of the ones in the journal.
 */
export const goalCheckInputOf = async (
	checkpointId: string,
	seen?: {
		inputsSeen: string[];
		devlogMedia: string[];
		devlogs: DayOneDevlog[];
	},
) => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			projectId: true,
			goal: true,
			stageName: true,
			stepId: true,
			startedAt: true,
			goalCheck: true,
			goalCheckHash: true,
			curatorCharacter: true,
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
	const [previous, facts, inputsSeen, devlogs, devlogMedia] = await Promise.all(
		[
			lastVerdict(checkpoint.projectId, checkpointId),
			// Before the start nobody has joined during it, and the period is the lead-in.
			checkpointFacts({ ...checkpoint, id: checkpointId, startedAt: null }),
			seen?.inputsSeen ?? lookedArtifactLines(checkpointId, 0),
			seen?.devlogs ?? dayOneDevlogs({ ...checkpoint, id: checkpointId }),
			seen?.devlogMedia ?? lookedMediaLines({ checkpointId, sprint: 0 }),
		],
	);

	const { kept, leftOut } = devlogsWithin(
		devlogs.map(toDevlog),
		(post) => devlogText(post.content).length,
		DAY_ONE_DEVLOG_CHARS,
	);
	const founder = members.find(
		(member) => member.status === TeamMemberStatus.Founder,
	);

	const input: GoalCheckInput = {
		card: toCard(checkpoint.goal, checkpoint.items),
		...facts,
		project: {
			name: checkpoint.project.name,
			pitch: checkpoint.project.description?.trim() || null,
			genre: checkpoint.project.genre?.trim() || null,
		},
		author: founder ? briefAuthor(founder) : null,
		character: checkpoint.curatorCharacter,
		previous,
		inputsSeen,
		// Absent rather than empty, so a card without them hashes as it did before GDHUB-156.
		...(kept.length ? { devlogs: kept } : {}),
		...(leftOut ? { devlogsLeftOut: leftOut } : {}),
		...(devlogMedia.length ? { devlogMedia } : {}),
	};
	return { checkpoint, input };
};

/**
 * The character the AI curator plays on this checkpoint, picked once from the
 * author's profile and kept for the 28 days, whatever the profile says later.
 */
export const keepCharacter = async (checkpointId: string) => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: { projectId: true, curatorCharacter: true },
	});
	if (!checkpoint || checkpoint.curatorCharacter) return;

	const character = await createCharacter(
		await curatorPersona(checkpoint.projectId),
		{ checkpointId, purpose: "character" },
	);
	if (!character) return;
	await prisma.projectCheckpoint.updateMany({
		where: { id: checkpointId, curatorCharacter: null },
		data: { curatorCharacter: character },
	});
};

/**
 * Day 1 with the AI curator (GDHUB-117): once the checkpoint is paid, the
 * curator reads the goal and writes the first letter — a word on the goal, the
 * tasks to start from, and a request for the author's own. Written once: a
 * second webhook finds the letter there. A read that fails leaves the letter
 * to the review page, which asks for it on first open.
 */
export const writeFirstLetter = async (
	checkpointId: string,
	{ notify = true } = {},
) => {
	const session = await prisma.checkpointSession.findFirst({
		where: { checkpointId, index: 1 },
		select: { id: true, content: true },
	});
	if (!session || session.content) return true;
	await keepCharacter(checkpointId);

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
				content: firstLetterContent(read),
				contentStatus: CheckpointSessionContentStatus.Ready,
			},
		});
		await journal({
			checkpointId,
			kind: CheckpointJournalKind.Letter,
			input: { letter: "first" },
			output: read,
		});
	}
	if (notify) await notifyDayOne(checkpointId, !!read);
	return !!read;
};

/** Session 1 as the first letter writes it. */
const firstLetterContent = (read: GoalCheckResult) =>
	({
		message: read.note,
		notes: null,
		advice: null,
		goal: read.goal,
		suggestions: read.suggestions,
	}) satisfies CuratorReview;

/**
 * Day 1 with the AI curator (GDHUB-117): once the plan is approved, by the
 * author or by itself, the letter the team reads through sprint 1. Written
 * once; one that fails leaves the page its plain line.
 */
export const writePlanLetter = async (checkpointId: string) => {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			curatorKind: true,
			goal: true,
			curatorCharacter: true,
			startedAt: true,
			items: {
				where: { kind: CheckpointItemKind.Outcome, cut: false },
				orderBy: { order: "asc" },
				select: { text: true },
			},
			sessions: { select: { id: true, index: true, content: true } },
		},
	});
	if (
		!checkpoint?.startedAt ||
		checkpoint.curatorKind !== CheckpointCuratorKind.AI
	) {
		return;
	}
	const first = checkpoint.sessions.find((session) => session.index === 1);
	const content = first?.content as CuratorReview | null;
	if (!first || !content || content.planLetter) return;

	const input = {
		character: checkpoint.curatorCharacter,
		goal: checkpoint.goal,
		tasks: checkpoint.items.map((item) => item.text),
		journal: lettersSoFar(checkpoint.sessions),
		reviewOn: reviewOnLabel(checkpoint.startedAt),
	};
	const message = await composePlanLetter(input, {
		checkpointId,
		purpose: "planLetter",
	});
	if (!message) return;
	await prisma.checkpointSession.update({
		where: { id: first.id },
		data: { content: { ...content, planLetter: message } },
	});
	await journal({
		checkpointId,
		kind: CheckpointJournalKind.Letter,
		input: { letter: "plan", ...input },
		output: { message },
	});
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

	const move = checkpointMove(
		CHECKPOINT_RUNNING_STATUSES,
		CheckpointStatus.Closed,
	);
	const { count } = await prisma.projectCheckpoint.updateMany({
		where: { id: checkpointId, ...move.where, verdict: null },
		data: {
			...move.data,
			summary: proposed.summary,
			verdict: settled.verdict,
			verdictNote: proposed.verdictNote,
			decidedAt: new Date(),
		},
	});
	// A refund or an admin's verdict landed while the report was being written.
	if (!count) return null;

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
		output: verdictReadOutput(read.reportInput, proposed),
	});
	return true;
};

/** The AI's verdict read as the journal keeps it. */
export const verdictReadOutput = (
	reportInput: ReportInput,
	proposed: ReportResult,
) => ({
	by: "ai" as const,
	proposed: proposed.verdict,
	settled: null,
	note: proposed.verdictNote,
	summary: proposed.summary,
	unproven: reportInput.unproven,
	// What the verdict window shows, so it never reads the input.
	evidence: reportInput.artifacts.flatMap((artifact) =>
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
});

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

/**
 * What the day-28 report reads: the card, the evidence as it opens today and
 * what it shows, the devlogs, the pulse — and, on a human curator's checkpoint,
 * what each call agreed. The AI curator's verdict and the human curator's AI
 * read (GDHUB-114) are written from the same input.
 */
export const reportInputFor = async (
	checkpointId: string,
	/** False for a regenerated read (GDHUB-156): nothing is checked or looked at again. */
	{ look = true } = {},
) => {
	// The verdict counts only evidence that opens today, not on the day it was added,
	// and the report says what that evidence shows.
	if (look) {
		await recheckCheckpointArtifacts(checkpointId);
		await seeCheckpointEvidence(checkpointId);
	}

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
			curatorCharacter: true,
			items: { select: curatorItemSelect, orderBy: { order: "asc" } },
			sessions: {
				where: { content: { not: Prisma.AnyNull } },
				orderBy: { index: "asc" },
				select: { index: true, content: true },
			},
			reports: {
				orderBy: { publishedAt: "asc" },
				select: { publishedAt: true, content: true, contentEditor: true },
			},
		},
	});
	if (!checkpoint) return null;

	const items = checkpoint.items;
	const facts = await checkpointFacts(
		{ ...checkpoint, id: checkpointId },
		runPeriod(checkpoint.startedAt ?? new Date(), checkpoint.dueAt),
	);

	const reportInput = {
		...reportEvidence(checkpoint.goal, items),
		...facts,
		revision: checkpoint.revisedAt
			? {
					revisedAt: checkpoint.revisedAt.toISOString().slice(0, 10),
					note: checkpoint.revisedNote,
				}
			: null,
		devlogs: checkpoint.reports.map(toDevlog),
		character: checkpoint.curatorCharacter,
		journal: lettersSoFar(checkpoint.sessions),
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
	};
	return {
		items,
		reportInput: {
			...reportInput,
			...(await runChange(checkpointId, checkpoint.sessions)),
		},
	};
};

/** The whole run for the verdict (GDHUB-133), as the model reads it. */
const runChange = async (
	checkpointId: string,
	sessions: { index: number; content: unknown }[],
) => {
	const { directions, difference } = await runChangeOf(checkpointId, sessions);
	return {
		directions,
		difference: difference ? renderDifference(difference, "day 1") : undefined,
	};
};
