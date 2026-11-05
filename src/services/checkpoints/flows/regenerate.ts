import { randomUUID } from "node:crypto";
import type { Prisma } from "@gdhub-io/gdhub-prisma";
import {
	ARTIFACTS_PER_SPRINT,
	DEVLOG_MEDIA_PER_SPRINT,
	FINAL_SESSION,
	REGENERATE_DRAFT_SECONDS,
	SCOPE_SESSION,
	SPRINT_VIDEO_SECONDS,
} from "@/config/checkpoint";
import {
	CheckpointCuratorKind,
	CheckpointJournalKind,
	type EvidenceMatch,
} from "@/config/prisma-enums";
import {
	answerOf,
	canRebuildIn,
	canRegenerateIn,
	type JournalRevision,
	openSteps,
	producerInputOf,
	type RevisionMode,
	stepOf,
	withRevision,
} from "@/lib/checkpoints/regenerate";
import {
	type SprintEvidence,
	sprintEvidence,
} from "@/repositories/checkpoints/call-notes";
import {
	type DayOneDevlog,
	dayOneDevlogs,
} from "@/repositories/checkpoints/day-one";
import { videoSecondsOf } from "@/repositories/checkpoints/journal";
import { entryMessage } from "@/repositories/checkpoints/journal-view";
import { reviewSelect } from "@/repositories/checkpoints/review";
import type { Tx } from "@/repositories/project/workflow";
import type { AiPurpose } from "@/services/ai-usage";
import { cacheSet, cacheTake } from "@/services/cache";
import {
	checkpointCurator,
	type GoalCheckResult,
} from "@/services/checkpoints/ai-curator";
import {
	composePlanLetter,
	type PlanLetterInput,
} from "@/services/checkpoints/ai-curator/plan-letter";
import type { PlanAdviceInput } from "@/services/checkpoints/ai-review";
import {
	goalCheckInputOf,
	reportInputFor,
	verdictReadOutput,
} from "@/services/checkpoints/flows/ai-curator";
import {
	artifactLine,
	artifactLook,
	artifactPicks,
	checkpointDevlogWords,
	dayOneMediaPicks,
	type EvidencePiece,
	evidenceLook,
	evidencePieceSelect,
	inputArtifacts,
	type Look,
	lookedArtifactLines,
	lookedMediaLines,
	lookLine,
	mediaLook,
	mediaPicks,
	sprintArtifactsBeside,
} from "@/services/checkpoints/flows/evidence-seen";
import {
	adviceContent,
	adviceFor,
	composeBrief,
	composeReview,
	sprintReviewInput,
	withoutGoalChecks,
} from "@/services/checkpoints/flows/review";
import { prisma } from "@/services/prisma";
import type {
	JournalDraftChangeDto,
	JournalDraftTarget,
	JournalMessageDto,
} from "@/types/checkpoint-journal";
import type {
	CallNotes,
	CuratorReview,
	GoalAdvice,
	PlanAdvice,
} from "@/types/checkpoints";

/**
 * Regenerate one AI answer of the curator journal, or rebuild a whole step's
 * input, as a draft an admin compares with the current answer (GDHUB-156,
 * docs/checkpoints-regenerate-flow.d2). The draft is computed by the same
 * producers the scheduled runs use, with the admin's hint as one extra input,
 * and kept in the cache under a one-time key. Replace writes it where the
 * scheduled run writes, in the same shape, and never moves the checkpoint:
 * statuses, "already checked" flags, hashes and dates stay as they are.
 */

const PURPOSE: AiPurpose = "regenerate";

/** Where the team reads what a replaced answer says. */
type TeamCopy =
	| {
			to: "evidence";
			evidenceId: string;
			match: EvidenceMatch;
			matchNote: string | null;
	  }
	| { to: "firstLetter"; result: GoalCheckResult }
	| { to: "planLetter"; message: string }
	| {
			to: "advice";
			index: number;
			start: boolean;
			written: {
				message: string | null;
				advice: PlanAdvice;
				goal: GoalAdvice | null;
			};
	  }
	| {
			to: "review";
			index: number;
			review: {
				message: string;
				notes: CallNotes;
				advice: CuratorReview["advice"];
			};
	  };

type DraftChange = {
	/** Null: a look the rebuild adds as a new row. */
	entryId: string | null;
	row: {
		kind: CheckpointJournalKind;
		sprint: number | null;
		link: string | null;
		itemId: string | null;
		devlogId: string | null;
	};
	/** A look's new read replaces its input; null keeps the input as it is. */
	input: Record<string, unknown> | null;
	output: Record<string, unknown>;
	team: TeamCopy | null;
};

export type JournalDraft = {
	checkpointId: string;
	adminId: string;
	mode: RevisionMode;
	hint: string | null;
	target: JournalDraftTarget;
	changes: DraftChange[];
};

/**
 * The cache key binds the draft to its checkpoint, admin and target, so a key
 * sent for anything else finds nothing and does not spend the draft.
 */
export const draftCacheKey = (
	checkpointId: string,
	adminId: string,
	target: JournalDraftTarget,
	key: string,
) =>
	`journal-draft:${checkpointId}:${adminId}:${"entryId" in target ? `entry-${target.entryId}` : `step-${target.step}`}:${key}`;

const contextSelect = {
	...reviewSelect,
	status: true,
	curatorKind: true,
	journal: {
		orderBy: { createdAt: "asc" },
		select: {
			id: true,
			kind: true,
			sprint: true,
			link: true,
			itemId: true,
			devlogId: true,
			input: true,
			output: true,
			createdAt: true,
		},
	},
} as const;

type Context = Prisma.ProjectCheckpointGetPayload<{
	select: typeof contextSelect;
}>;
type Entry = Context["journal"][number];

const loadContext = (checkpointId: string) =>
	prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: contextSelect,
	});

const lookChange = (
	entryId: string | null,
	row: Look["row"],
	team: TeamCopy | null = null,
): DraftChange => ({
	entryId,
	row: {
		kind: row.kind,
		sprint: row.sprint ?? null,
		link: row.link ?? null,
		itemId: row.itemId ?? null,
		devlogId: row.devlogId ?? null,
	},
	input: row.input as Record<string, unknown>,
	output: row.output as Record<string, unknown>,
	team,
});

const pieceKey = (itemId: string | null, link: string | null) =>
	`${itemId} ${link}`;

/** The evidence pieces Evidence entries judged, by task and link, in one read. */
const piecesOf = async (entries: Entry[]) => {
	const itemIds = [
		...new Set(
			entries.flatMap((entry) => (entry.itemId ? [entry.itemId] : [])),
		),
	];
	const pieces = itemIds.length
		? await prisma.checkpointItemEvidence.findMany({
				where: { itemId: { in: itemIds } },
				select: evidencePieceSelect,
			})
		: [];
	const byKey = new Map<string, EvidencePiece>();
	for (const piece of pieces) {
		const key = pieceKey(piece.item.id, piece.artifact.link);
		if (!byKey.has(key)) byKey.set(key, piece);
	}
	return byKey;
};

const evidenceTeam = (
	piece: EvidencePiece,
	judged: { match: EvidenceMatch; note: string | null },
): TeamCopy => ({
	to: "evidence",
	evidenceId: piece.id,
	match: judged.match,
	matchNote: judged.note,
});

type Judged = Map<string, { match: EvidenceMatch; note: string | null }>;

/** What a sprint's review reads besides the checkpoint: its devlogs and the lines seen in them and its artifacts. */
type SprintSeen = {
	evidence: SprintEvidence;
	devlogMedia: string[];
	artifactsSeen: string[];
	/** A rebuild's new judgements, standing in for the matches on the tasks. */
	judged: Judged;
};

/** A sprint as the journal last saw it; nothing is looked at. */
const sprintSeenInJournal = async (
	context: Context,
	startedAt: Date,
	sprint: number,
): Promise<SprintSeen> => {
	const [evidence, artifactsSeen] = await Promise.all([
		sprintEvidence(context.projectId, startedAt, sprint),
		lookedArtifactLines(context.id, sprint),
	]);
	return {
		evidence,
		artifactsSeen,
		devlogMedia: await lookedMediaLines({
			devlogId: { in: evidence.posts.map((post) => post.id) },
		}),
		judged: new Map(),
	};
};

/** The input a sprint's review and brief are written from. */
const reviewInputOf = async (
	context: Context,
	startedAt: Date,
	sprint: number,
	seen: SprintSeen,
) => {
	const index = sprint + 1;
	const { judged } = seen;
	const checkpoint = judged.size
		? {
				...context,
				items: context.items.map((item) => ({
					...item,
					evidence: item.evidence.map((piece) => {
						const read = judged.get(pieceKey(item.id, piece.artifact.link));
						return read
							? { ...piece, match: read.match, matchNote: read.note }
							: piece;
					}),
				})),
			}
		: context;
	return {
		checkpoint,
		index,
		input: await sprintReviewInput(
			checkpoint,
			startedAt,
			index,
			index === FINAL_SESSION,
			seen,
		),
	};
};

type ReviewRead = Awaited<ReturnType<typeof reviewInputOf>>;

/** What a rebuild has just read, given to the step's answers in place of the journal. */
type Seen = {
	dayOne: {
		inputsSeen: string[];
		devlogMedia: string[];
		devlogs: DayOneDevlog[];
	} | null;
	review: ReviewRead | null;
};

/** One AI answer written again; null when the model gives nothing usable or its source is gone. */
const answerChange = async (
	context: Context,
	entry: Entry,
	hint: string | null,
	seen: Seen | null,
): Promise<DraftChange | null> => {
	const meter = { checkpointId: context.id, purpose: PURPOSE };
	const same = (output: object, team: TeamCopy | null = null) => ({
		entryId: entry.id,
		row: {
			kind: entry.kind,
			sprint: entry.sprint,
			link: entry.link,
			itemId: entry.itemId,
			devlogId: entry.devlogId,
		},
		input: null,
		output: output as Record<string, unknown>,
		team,
	});
	const sprint = stepOf(entry);
	const answer = answerOf(entry);

	switch (answer) {
		case "firstLetter": {
			const read = await goalCheckInputOf(
				context.id,
				seen?.dayOne ?? undefined,
			);
			if (!read) return null;
			const result = await checkpointCurator.checkGoal(
				{ ...read.input, hint },
				meter,
			);
			return result && same(result, { to: "firstLetter", result });
		}
		case "planLetter": {
			const input = producerInputOf<PlanLetterInput>(entry);
			const message = await composePlanLetter({ ...input, hint }, meter);
			return message ? same({ message }, { to: "planLetter", message }) : null;
		}
		case "advice": {
			const input = producerInputOf<PlanAdviceInput>(entry);
			const written = await adviceFor(
				{ ...input, hint },
				context.items,
				context.id,
				PURPOSE,
			);
			const start = entry.sprint === null;
			return (
				written &&
				same(written, {
					to: "advice",
					index: start ? 1 : SCOPE_SESSION,
					start: start && input.moment === "start",
					written,
				})
			);
		}
		case "review":
		case "brief": {
			const { startedAt } = context;
			if (!startedAt || sprint < 1) return null;
			const { checkpoint, index, input } =
				seen?.review ??
				(await reviewInputOf(
					context,
					startedAt,
					sprint,
					await sprintSeenInJournal(context, startedAt, sprint),
				));
			const options = { purpose: PURPOSE, hint, advicePurpose: PURPOSE };
			if (answer === "brief") {
				const output = await composeBrief(checkpoint, index, input, options);
				return output && same(output);
			}
			const review = await composeReview(checkpoint, index, input, options);
			return review && same(review, { to: "review", index, review });
		}
		case "verdictRead": {
			const read = await reportInputFor(context.id, { look: false });
			if (!read) return null;
			const proposed = await checkpointCurator.writeReport(
				{ ...read.reportInput, hint },
				meter,
			);
			return proposed && same(verdictReadOutput(read.reportInput, proposed));
		}
		case "look":
			return lookAgain(context, entry, hint);
		default:
			return null;
	}
};

/** Video already spent in a sprint, but for the look being redone. */
const videoLeft = (context: Context, entry: Entry) =>
	SPRINT_VIDEO_SECONDS -
	videoSecondsOf(
		context.journal.filter(
			(row) =>
				row.id !== entry.id &&
				stepOf(row) === stepOf(entry) &&
				answerOf(row) === "look",
		),
	);

/** One look read again from its link. */
const lookAgain = async (
	context: Context,
	entry: Entry,
	hint: string | null,
): Promise<DraftChange | null> => {
	if (!entry.link) return null;
	const sprint = stepOf(entry);
	const left = videoLeft(context, entry);
	const options = { purpose: PURPOSE, hint };
	const read = (entry.input ?? {}) as {
		artifactName?: string | null;
		artifactType?: string;
		devlog?: string;
	};
	if (entry.kind === CheckpointJournalKind.Evidence) {
		const piece = (await piecesOf([entry])).get(
			pieceKey(entry.itemId, entry.link),
		);
		if (!piece) return null;
		const look = await evidenceLook(
			context.id,
			sprint,
			piece,
			left,
			await checkpointDevlogWords(context.id),
			options,
		);
		return look?.row
			? lookChange(entry.id, look.row, evidenceTeam(piece, look.judged))
			: null;
	}
	if (entry.kind === CheckpointJournalKind.Artifact) {
		const look = await artifactLook(
			context.id,
			sprint,
			{
				link: entry.link,
				type: read.artifactType ?? "",
				name: read.artifactName ?? null,
			},
			left,
			options,
		);
		return look && lookChange(entry.id, look.row);
	}
	if (!entry.devlogId) return null;
	const devlog = await prisma.projectReport.findUnique({
		where: { id: entry.devlogId },
		select: { id: true, content: true },
	});
	const look = await mediaLook(
		context.id,
		sprint,
		devlog ?? { id: entry.devlogId, content: read.devlog ?? "" },
		entry.link,
		left,
		options,
	);
	return look && lookChange(entry.id, look.row);
};

/** The latest look of a step at the same thing, which a rebuild's new look replaces. */
const lookOf = (
	context: Context,
	step: number,
	kind: CheckpointJournalKind,
	match: (entry: Entry) => boolean,
) =>
	context.journal
		.filter(
			(entry) => entry.kind === kind && stepOf(entry) === step && match(entry),
		)
		.at(-1)?.id ?? null;

/** Everything a step looks at, read again as the scheduled run would with nothing seen yet, then its answers written again. */
const rebuildChanges = async (
	context: Context,
	startedAt: Date,
	step: number,
	hint: string | null,
) => {
	const options = { purpose: PURPOSE, hint };
	const changes: DraftChange[] = [];
	let left = SPRINT_VIDEO_SECONDS;
	/** The video is spent even when nothing usable came of the look. */
	const add = (
		look: { videoSeconds: number; row: Look["row"] | null } | null,
		entryId: string | null,
		team: TeamCopy | null = null,
	) => {
		if (!look) return null;
		left -= look.videoSeconds;
		if (!look.row) return null;
		const change = lookChange(entryId, look.row, team);
		changes.push(change);
		return change;
	};

	const [artifacts, dayOne, evidence] = await Promise.all([
		step === 0
			? inputArtifacts(context.id)
			: sprintArtifactsBeside(context.id, step).then((rows) => rows ?? []),
		step === 0 ? dayOneDevlogs(context) : null,
		step === 0 ? null : sprintEvidence(context.projectId, startedAt, step),
	]);

	const artifactLines: string[] = [];
	for (const artifact of artifactPicks(
		uniqueBy(artifacts, (row) => row.link),
		[],
	)) {
		const change = add(
			await artifactLook(context.id, step, artifact, left, options),
			lookOf(
				context,
				step,
				CheckpointJournalKind.Artifact,
				(entry) => entry.link === artifact.link,
			),
		);
		if (change)
			artifactLines.push(artifactLine({ ...change, link: change.row.link }));
	}

	const picks = dayOne
		? dayOneMediaPicks(dayOne, new Set(), DEVLOG_MEDIA_PER_SPRINT)
		: mediaPicks(evidence?.posts ?? [], new Set(), DEVLOG_MEDIA_PER_SPRINT);
	const mediaLines: string[] = [];
	for (const { devlog, link } of picks) {
		const change = add(
			await mediaLook(context.id, step, devlog, link, left, options),
			lookOf(
				context,
				step,
				CheckpointJournalKind.DevlogMedia,
				(entry) => entry.devlogId === devlog.id && entry.link === link,
			),
		);
		if (change) mediaLines.push(lookLine({ ...change, link: change.row.link }));
	}

	const judged: Judged = new Map();
	const evidenceEntries = uniqueBy(
		context.journal.filter(
			(entry) =>
				entry.kind === CheckpointJournalKind.Evidence && stepOf(entry) === step,
		),
		(entry) => pieceKey(entry.itemId, entry.link),
		true,
	);
	if (evidenceEntries.length) {
		const [pieces, words] = await Promise.all([
			piecesOf(evidenceEntries),
			checkpointDevlogWords(context.id),
		]);
		for (const entry of evidenceEntries) {
			const piece = pieces.get(pieceKey(entry.itemId, entry.link));
			if (!piece) continue;
			const look = await evidenceLook(
				context.id,
				step,
				piece,
				left,
				words,
				options,
			);
			const made = add(
				look,
				entry.id,
				look?.judged && evidenceTeam(piece, look.judged),
			);
			if (made && look?.judged) {
				judged.set(pieceKey(piece.item.id, piece.artifact.link), {
					match: look.judged.match,
					note: look.judged.note,
				});
			}
		}
	}

	// The step's own answers, from what was just seen.
	const answers = uniqueBy(
		context.journal.filter((entry) => {
			const answer = answerOf(entry);
			return (
				stepOf(entry) === step &&
				(step === 0
					? answer === "firstLetter"
					: answer === "review" || answer === "brief")
			);
		}),
		(row) => answerOf(row),
		true,
	);
	if (!answers.length) return changes;
	const seen: Seen = {
		dayOne: dayOne && {
			inputsSeen: artifactLines,
			devlogMedia: mediaLines,
			devlogs: dayOne,
		},
		// Read once for the review and the brief alike.
		review: evidence
			? await reviewInputOf(context, startedAt, step, {
					evidence,
					devlogMedia: mediaLines,
					artifactsSeen: artifactLines,
					judged,
				})
			: null,
	};
	for (const entry of answers) {
		const change = await answerChange(context, entry, hint, seen);
		if (change) changes.push(change);
	}
	return changes;
};

/** One per key; the last one wins when `last` is set, the first otherwise. */
const uniqueBy = <T>(rows: T[], key: (row: T) => unknown, last = false) => {
	const seen = new Map<unknown, T>();
	for (const row of rows) {
		if (last || !seen.has(key(row))) seen.set(key(row), row);
	}
	return [...seen.values()];
};

export type DraftResult =
	| { ok: true; draftKey: string; changes: JournalDraftChangeDto[] }
	| { ok: false; error: "notFound" | "closed" | "failed" };

/** Keeps the draft under a one-time key and shows each change beside the journal row it replaces. */
const keep = async (
	context: Context,
	draft: JournalDraft,
): Promise<DraftResult> => {
	if (!draft.changes.length) return { ok: false, error: "failed" };
	const key = randomUUID();
	await cacheSet(
		draftCacheKey(draft.checkpointId, draft.adminId, draft.target, key),
		draft,
		REGENERATE_DRAFT_SECONDS,
	);
	const now = new Date();
	const taskText = new Map(context.items.map((item) => [item.id, item.text]));
	const show = (row: Parameters<typeof entryMessage>[0]) =>
		entryMessage(row, {
			startedAt: context.startedAt,
			devlogTitle: () => null,
			nameOf: () => null,
			taskName: (id) => (id && taskText.get(id)) || null,
		});
	const byId = new Map(context.journal.map((row) => [row.id, row]));
	return {
		ok: true,
		draftKey: key,
		changes: draft.changes.map((change) => {
			const entry = change.entryId ? byId.get(change.entryId) : undefined;
			return {
				entryId: change.entryId,
				current: entry ? show(entry) : null,
				draft: show({
					id: change.entryId ?? `new-${randomUUID()}`,
					...change.row,
					input: change.input ?? entry?.input ?? null,
					output: change.output,
					createdAt: now,
				}) as JournalMessageDto,
			};
		}),
	};
};

/** One AI answer as a draft beside the current one; nothing is written. */
export const regenerateEntry = async (
	checkpointId: string,
	entryId: string,
	adminId: string,
	hint: string | null,
): Promise<DraftResult> => {
	const context = await loadContext(checkpointId);
	const entry = context?.journal.find((row) => row.id === entryId);
	if (!context || !entry) return { ok: false, error: "notFound" };
	if (!canRegenerateIn(openSteps(context, context.journal), entry)) {
		return { ok: false, error: "closed" };
	}
	const change = await answerChange(context, entry, hint, null);
	return keep(context, {
		checkpointId,
		adminId,
		mode: "regenerate",
		hint,
		target: { entryId },
		changes: change ? [change] : [],
	});
};

/** A step's looks and answers, all made again, as one draft; nothing is written. */
export const rebuildStep = async (
	checkpointId: string,
	step: number,
	adminId: string,
	hint: string | null,
): Promise<DraftResult> => {
	const context = await loadContext(checkpointId);
	if (!context) return { ok: false, error: "notFound" };
	const { startedAt } = context;
	if (!startedAt || !canRebuildIn(openSteps(context, context.journal), step)) {
		return { ok: false, error: "closed" };
	}
	return keep(context, {
		checkpointId,
		adminId,
		mode: "rebuild",
		hint,
		target: { step },
		changes: await rebuildChanges(context, startedAt, step, hint),
	});
};

/** What Replace reads: the open-step rule's facts and the journal it writes into. */
const replaceSelect = {
	id: true,
	status: true,
	verdict: true,
	startedAt: true,
	curatorKind: true,
	journal: {
		select: { id: true, kind: true, sprint: true, input: true, output: true },
	},
} as const;

type ReplaceContext = Prisma.ProjectCheckpointGetPayload<{
	select: typeof replaceSelect;
}>;

export type ReplaceResult =
	| { ok: true }
	| { ok: false; error: "notFound" | "gone" | "closed" };

/**
 * Applies a draft: its key is spent whatever happens next. The open-step rule
 * is checked again — the night run may have built on the answer meanwhile.
 */
export const replaceDraft = async (
	checkpointId: string,
	adminId: string,
	draftKey: string,
	target: JournalDraftTarget,
	now = new Date(),
): Promise<ReplaceResult> => {
	// The key names the checkpoint, admin and target: one sent for anything else finds nothing.
	const draft = await cacheTake<JournalDraft>(
		draftCacheKey(checkpointId, adminId, target, draftKey),
	);
	if (
		!draft ||
		draft.checkpointId !== checkpointId ||
		draft.adminId !== adminId
	) {
		return { ok: false, error: "gone" };
	}

	const context = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: replaceSelect,
	});
	if (!context) return { ok: false, error: "notFound" };
	const steps = openSteps(context, context.journal);
	let open: boolean;
	if ("entryId" in target) {
		const entry = context.journal.find((row) => row.id === target.entryId);
		open = !!entry && canRegenerateIn(steps, entry);
	} else {
		open = canRebuildIn(steps, target.step, now);
	}
	if (!open) return { ok: false, error: "closed" };

	await applyDraft(context, draft, now);
	return { ok: true };
};

/** Every change of a draft in one transaction: the journal in place, the team's copy where the scheduled run keeps it. */
const applyDraft = async (
	context: ReplaceContext,
	draft: JournalDraft,
	now: Date,
) => {
	const revisedAt = now.toISOString();
	const entries = new Map(context.journal.map((row) => [row.id, row]));
	await prisma.$transaction(async (tx) => {
		for (const change of draft.changes) {
			const entry = change.entryId ? entries.get(change.entryId) : undefined;
			if (change.entryId && !entry) continue;
			const revision: JournalRevision = {
				at: revisedAt,
				by: draft.adminId,
				mode: draft.mode,
				hint: draft.hint,
				previousOutput: entry?.output ?? null,
			};
			const input = withRevision(
				entry?.input ?? null,
				revision,
				change.input,
			) as Prisma.InputJsonObject;
			const output = change.output as Prisma.InputJsonObject;
			if (change.entryId) {
				await tx.checkpointJournalEntry.update({
					where: { id: change.entryId },
					data: { input, output },
				});
			} else {
				await tx.checkpointJournalEntry.create({
					data: { checkpointId: context.id, ...change.row, input, output },
				});
			}
			if (change.team) {
				await writeTeamCopy(tx, context, change.team, revisedAt);
			}
		}
	});
};

const sessionContent = async (tx: Tx, checkpointId: string, index: number) => {
	const session = await tx.checkpointSession.findFirst({
		where: { checkpointId, index },
		select: { id: true, content: true },
	});
	return (
		session && {
			id: session.id,
			content: session.content as CuratorReview | null,
		}
	);
};

/** The team-facing copy, in the shape the scheduled run writes, plus `revisedAt`; never a status, flag, hash or date. */
const writeTeamCopy = async (
	tx: Tx,
	context: Pick<ReplaceContext, "id" | "curatorKind">,
	team: TeamCopy,
	revisedAt: string,
) => {
	if (team.to === "evidence") {
		await tx.checkpointItemEvidence.update({
			where: { id: team.evidenceId },
			data: { match: team.match, matchNote: team.matchNote },
		});
		return;
	}
	const index =
		team.to === "firstLetter" || team.to === "planLetter" ? 1 : team.index;
	const session = await sessionContent(tx, context.id, index);
	if (!session?.content) return;
	const { content } = session;
	let next: CuratorReview;
	switch (team.to) {
		case "firstLetter": {
			const { result } = team;
			// Once the check's letter took its place, the first letter is kept aside.
			next =
				content.firstLetter !== undefined
					? {
							...content,
							firstLetter: result.note,
							suggestions: result.suggestions,
						}
					: {
							...content,
							message: result.note,
							goal: result.goal,
							suggestions: result.suggestions,
						};
			await tx.projectCheckpoint.update({
				where: { id: context.id },
				data: { goalCheck: result },
			});
			break;
		}
		case "planLetter":
			next = { ...content, planLetter: team.message };
			break;
		case "advice": {
			const ai = context.curatorKind === CheckpointCuratorKind.AI;
			const shown = ai ? team.written : withoutGoalChecks(team.written);
			next = adviceContent(
				content,
				team.written,
				{ ...shown, advice: keepHash(shown.advice, content.advice) },
				team.start,
				content.checkedAt,
			);
			break;
		}
		case "review":
			next = {
				...content,
				message: team.review.message,
				notes: team.review.notes,
				// Advice checked on the author's changes afterwards stays theirs.
				advice: content.checkedAt
					? content.advice
					: team.review.advice && keepHash(team.review.advice, content.advice),
			};
			break;
	}
	await tx.checkpointSession.update({
		where: { id: session.id },
		data: { content: { ...next, revisedAt } },
	});
};

/** The advice's hash is what the plan check compares: it stays the one the scheduled run stored. */
const keepHash = (advice: PlanAdvice, current: PlanAdvice | null) =>
	current?.hash ? { ...advice, hash: current.hash } : advice;
