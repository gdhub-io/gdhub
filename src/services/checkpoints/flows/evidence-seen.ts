import type { Prisma } from "@gdhub-io/gdhub-prisma";
import {
	ARTIFACTS_PER_SPRINT,
	DEVLOG_MEDIA_PER_SPRINT,
	JOURNAL_TEXT_CHARS,
	SPRINT_VIDEO_SECONDS,
} from "@/config/checkpoint";
import {
	ArtifactCheckStatus,
	CheckpointItemKind,
	CheckpointJournalKind,
	EvidenceMatch,
	ProjectArtifactType,
} from "@/config/prisma-enums";
import { capped, devlogWords } from "@/lib/checkpoints/curator-text";
import { dateOfDay } from "@/lib/checkpoints/plan";
import {
	currentSprint,
	sprintOfDate,
	sprintRange,
} from "@/lib/checkpoints/sprints";
import {
	CHECKPOINT_RUNNING_STATUSES,
	isRunning,
} from "@/lib/checkpoints/status";
import { standingOf } from "@/lib/checkpoints/verdict";
import { dayOneDevlogs } from "@/repositories/checkpoints/day-one";
import {
	devlogMediaLinks,
	mediaLine,
	readable,
} from "@/repositories/checkpoints/evidence-seen";
import {
	journal,
	sprintLooks,
	videoSecondsOf,
} from "@/repositories/checkpoints/journal";
import { checkArtifact } from "@/repositories/project/artifact-check";
import type { AiMeter, AiPurpose } from "@/services/ai-usage";
import {
	describeMedia,
	type EvidenceTask,
	judgeEvidence,
} from "@/services/evidence/judge";
import { readableLink } from "@/services/evidence/links";
import { type EvidenceContent, readEvidence } from "@/services/evidence/read";
import { prisma } from "@/services/prisma";

/** What was read at a link, as the journal keeps it: text only, never the files. */
const whatWasRead = (link: string, content: EvidenceContent) => ({
	opened: readableLink(link).url,
	text: content.text && capped(content.text, JOURNAL_TEXT_CHARS),
	images: content.images.length,
	videoSeconds: content.videoSeconds,
	unread: content.unread,
});

/** A look's record in the journal, with what it was about; the admin journal reads it. */
export type JournalRead = ReturnType<typeof whatWasRead> & {
	task?: string;
	artifactName?: string | null;
	artifactType?: string;
	devlog?: string;
};

/** An artifact read as the curator reads it: a build's page, never the build. */
export const readArtifact = (
	artifact: { link: string; type: string },
	videoSecondsLeft: number,
	/** Charged when the page has to be read through web search. */
	meter?: AiMeter,
) =>
	readEvidence(artifact.link, {
		videoSecondsLeft,
		pageOnly: artifact.type === ProjectArtifactType.ExecutableBuild,
		meter,
	});

/** What was read, judged against its task; nothing readable is CannotTell and costs no model call. */
export const judgeRead = async (
	task: EvidenceTask,
	content: EvidenceContent,
	meter?: AiMeter,
	locale?: string,
) =>
	readable(content)
		? judgeEvidence(task, content, meter, locale)
		: { match: EvidenceMatch.CannotTell, note: content.unread };

/** What a devlog's image or video shows; null when nothing could be read. */
export const describeRead = async (
	content: EvidenceContent,
	meter?: AiMeter,
	locale?: string,
	hint?: string | null,
) => (readable(content) ? describeMedia(content, meter, locale, hint) : null);

/** How a look is charged, and the admin's note when it is regenerated (GDHUB-156). */
export type LookOptions = { purpose?: AiPurpose; hint?: string | null };

type JournalRow = Prisma.CheckpointJournalEntryUncheckedCreateInput;

/** One look, made and not yet written: the journal row and the video it spent. */
export type Look = { row: JournalRow; videoSeconds: number };

/** An evidence piece as it is judged: the task it is offered for and the artifact. */
export const evidencePieceSelect = {
	id: true,
	item: { select: { id: true, text: true } },
	artifact: {
		select: { type: true, name: true, description: true, link: true },
	},
} as const satisfies Prisma.CheckpointItemEvidenceSelect;

export type EvidencePiece = Prisma.CheckpointItemEvidenceGetPayload<{
	select: typeof evidencePieceSelect;
}>;

/**
 * One piece of evidence read and judged against its task — the compute half
 * of `seeCheckpointEvidence`, which writes it; null when it could not be read
 * or judged.
 */
export async function evidenceLook(
	checkpointId: string,
	sprint: number,
	piece: EvidencePiece,
	left: number,
	devlogs: string[],
	{ purpose = "evidence", hint }: LookOptions = {},
) {
	const { artifact, item } = piece;
	const meter = { checkpointId, purpose };
	const content = await readArtifact(artifact, left, meter).catch((error) => {
		console.error("[evidence] read failed", piece.id, error);
		return null;
	});
	if (!content) return null;

	const task = {
		task: item.text,
		artifactType: artifact.type,
		artifactName: artifact.name,
		description: artifact.description,
	};
	const judged = await judgeRead(
		{ ...task, devlogs, hint },
		content,
		meter,
	).catch((error) => {
		console.error("[evidence] judge failed", piece.id, error);
		return null;
	});
	// The video was spent even when the judging failed.
	if (!judged) return { videoSeconds: content.videoSeconds, judged, row: null };
	return {
		videoSeconds: content.videoSeconds,
		judged,
		row: {
			checkpointId,
			kind: CheckpointJournalKind.Evidence,
			sprint,
			link: artifact.link,
			itemId: item.id,
			input: { ...task, ...whatWasRead(artifact.link, content) },
			output: judged,
		},
	};
}

/** One artifact read and described — the compute half of `lookAtArtifacts`. */
export async function artifactLook(
	checkpointId: string,
	sprint: number,
	artifact: { link: string; type: string; name: string | null },
	left: number,
	{ purpose = "evidence", hint }: LookOptions = {},
): Promise<Look | null> {
	const meter = { checkpointId, purpose };
	const content = await readArtifact(artifact, left, meter).catch(() => null);
	if (!content) return null;
	const shows = await describeRead(content, meter, undefined, hint).catch(
		() => null,
	);
	return {
		videoSeconds: content.videoSeconds,
		row: {
			checkpointId,
			kind: CheckpointJournalKind.Artifact,
			sprint,
			link: artifact.link,
			input: {
				artifactName: artifact.name,
				artifactType: artifact.type,
				...whatWasRead(artifact.link, content),
			},
			output: { shows },
		},
	};
}

/** One image or video of a devlog read and described — the compute half of `seeDevlogMedia`. */
export async function mediaLook(
	checkpointId: string,
	sprint: number,
	devlog: { id: string; content: string },
	link: string,
	left: number,
	{ purpose = "evidence", hint }: LookOptions = {},
): Promise<Look | null> {
	const meter = { checkpointId, purpose };
	const content = await readEvidence(link, {
		videoSecondsLeft: left,
		meter,
	}).catch(() => null);
	if (!content) return null;
	const shows = await describeRead(content, meter, undefined, hint).catch(
		() => null,
	);
	return {
		videoSeconds: content.videoSeconds,
		row: {
			checkpointId,
			kind: CheckpointJournalKind.DevlogMedia,
			sprint,
			link,
			devlogId: devlog.id,
			input: {
				devlog: capped(devlog.content, 80),
				...whatWasRead(link, content),
			},
			output: { shows },
		},
	};
}

/** The checkpoint's devlogs as evidence judging reads them: context, oldest first. */
export const checkpointDevlogWords = async (checkpointId: string) =>
	(
		await prisma.projectReport.findMany({
			where: { checkpointId },
			orderBy: { publishedAt: "asc" },
			select: { content: true, contentEditor: true },
		})
	).map(devlogWords);

/**
 * Look at the evidence on a checkpoint's tasks that has not been looked at yet,
 * and judge each against its task. Runs when an artifact arrives and again
 * before a review, for anything missed. A new link on an artifact is looked at
 * again; the same link never is. Video comes out of the current sprint's budget.
 */
export async function seeCheckpointEvidence(checkpointId: string) {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			startedAt: true,
			status: true,
		},
	});
	if (!checkpoint?.startedAt || !isRunning(checkpoint.status)) return;
	const sprint = currentSprint(checkpoint.startedAt);
	// Read once, and only when something is about to be judged.
	let devlogs: string[] | undefined;

	// Every artifact offered for an open task, each judged on its own.
	const pieces = await prisma.checkpointItemEvidence.findMany({
		where: {
			item: { checkpointId, kind: CheckpointItemKind.Outcome, cut: false },
			artifact: { checkStatus: ArtifactCheckStatus.Readable },
		},
		orderBy: [{ item: { order: "asc" } }, { createdAt: "asc" }],
		select: { ...evidencePieceSelect, seenLink: true },
	});

	// A task whose artifact missed it this run, told about once all are judged.
	const missed = new Map<
		string,
		{ item: { id: string; text: string }; note: string; link: string }
	>();
	let left =
		SPRINT_VIDEO_SECONDS -
		videoSecondsOf(await sprintLooks(checkpointId, sprint));
	for (const piece of pieces) {
		const { artifact, item } = piece;
		if (piece.seenLink === artifact.link) continue;

		devlogs ??= await checkpointDevlogWords(checkpointId);
		const look = await evidenceLook(checkpointId, sprint, piece, left, devlogs);
		if (!look) continue;
		left -= look.videoSeconds;
		if (!look.row) continue;
		const { judged } = look;

		await prisma.checkpointItemEvidence.update({
			where: { id: piece.id },
			data: {
				match: judged.match,
				matchNote: judged.note,
				seenLink: artifact.link,
			},
		});
		if (
			judged.match === EvidenceMatch.DoesNotMatch ||
			judged.match === EvidenceMatch.Partly
		) {
			missed.set(item.id, { item, note: judged.note, link: artifact.link });
		}
		await journal(look.row);
	}

	if (!missed.size) return;
	// The task counts by its best artifact: one that shows it leaves nothing to fix.
	const tasks = await prisma.checkpointItem.findMany({
		where: { id: { in: [...missed.keys()] } },
		select: {
			id: true,
			kind: true,
			text: true,
			cut: true,
			acceptedNote: true,
			evidence: {
				select: {
					match: true,
					matchNote: true,
					artifact: { select: { checkStatus: true, checkNote: true } },
				},
			},
		},
	});
	const { notifyEvidenceMismatch } = await import(
		"@/services/checkpoints/notifications"
	);
	const delivered = new Set(
		tasks
			.filter((task) => standingOf(task).is === "delivered")
			.map(({ id }) => id),
	);
	for (const { item, note, link } of missed.values()) {
		if (!delivered.has(item.id)) {
			await notifyEvidenceMismatch(checkpointId, item, note, link);
		}
	}
}

/**
 * An artifact arrived or its link changed: check that it opens, then look at it
 * on every running checkpoint that uses it, whoever its curator is.
 */
export async function checkAndLook(
	artifactId: string,
	{ checked = false } = {},
) {
	if (!checked) await checkArtifact(artifactId);
	const uses = await prisma.checkpointItemEvidence.findMany({
		where: {
			artifactId,
			item: { checkpoint: { status: { in: CHECKPOINT_RUNNING_STATUSES } } },
		},
		select: { item: { select: { checkpointId: true } } },
	});
	for (const checkpointId of new Set(
		uses.map((use) => use.item.checkpointId),
	)) {
		await seeCheckpointEvidence(checkpointId);
	}
}

/**
 * Look at the images and videos of a devlog posted on a running checkpoint,
 * each link once, and journal what they show. Runs when the devlog is posted or
 * edited, and again before a review for anything missed.
 */
export async function seeDevlogMedia(devlogId: string) {
	const post = await prisma.projectReport.findUnique({
		where: { id: devlogId },
		select: {
			content: true,
			video: true,
			contentEditor: true,
			publishedAt: true,
			checkpoint: {
				select: { id: true, startedAt: true, status: true },
			},
		},
	});
	const checkpoint = post?.checkpoint;
	if (!post || !checkpoint?.startedAt || !isRunning(checkpoint.status)) return;
	const checkpointId = checkpoint.id;
	const sprint =
		sprintOfDate(checkpoint.startedAt, post.publishedAt) ??
		currentSprint(checkpoint.startedAt);

	const looks = await sprintLooks(checkpointId, sprint);
	const looked = looks.filter(
		(look) => look.kind === CheckpointJournalKind.DevlogMedia,
	);
	const picks = mediaPicks(
		[{ ...post, id: devlogId }],
		new Set(looked.map(seenKey)),
		DEVLOG_MEDIA_PER_SPRINT - looked.length,
	);
	await lookAtMedia(checkpointId, sprint, picks, looks);
}

type MediaDevlog = {
	id: string;
	content: string;
	video: string | null;
	contentEditor: unknown;
};

const seenKey = (look: { devlogId: string | null; link: string | null }) =>
	`${look.devlogId} ${look.link}`;

/**
 * The images and videos of devlogs to look at, in the order given, each link
 * not in `seen` (devlog id and link) once, inside the budget. The scheduled
 * runs and a rebuild (GDHUB-156, nothing seen) pick through it alike.
 */
export const mediaPicks = <T extends MediaDevlog>(
	devlogs: T[],
	seen: Set<string>,
	budget: number,
) =>
	devlogs
		.flatMap((devlog) =>
			devlogMediaLinks(devlog)
				.filter((link) => !seen.has(seenKey({ devlogId: devlog.id, link })))
				.map((link) => ({ devlog, link })),
		)
		.slice(0, Math.max(0, budget));

/** Reads each picked image or video and journals what it shows, inside the video budget left. */
async function lookAtMedia(
	checkpointId: string,
	sprint: number,
	picks: { devlog: { id: string; content: string }; link: string }[],
	looks: { input: unknown }[],
) {
	let left = SPRINT_VIDEO_SECONDS - videoSecondsOf(looks);
	for (const { devlog, link } of picks) {
		const look = await mediaLook(checkpointId, sprint, devlog, link, left);
		if (!look) continue;
		left -= look.videoSeconds;
		await journal(look.row);
	}
}

/**
 * What the images and videos in a sprint's devlogs show, one line each, for the
 * sprint review: read from the journal, after looking at anything missed.
 */
export async function devlogMediaLines(devlogIds: string[]) {
	for (const id of devlogIds) await seeDevlogMedia(id);
	return lookedMediaLines({ devlogId: { in: devlogIds } });
}

/** What was already seen in devlog media, without looking again. */
export async function lookedMediaLines(
	where: Prisma.CheckpointJournalEntryWhereInput,
) {
	const looked = await prisma.checkpointJournalEntry.findMany({
		where: { ...where, kind: CheckpointJournalKind.DevlogMedia },
		orderBy: { createdAt: "asc" },
		select: { link: true, input: true, output: true },
	});
	return looked.map(lookLine);
}

/** A journal look as the review and the goal check read it. */
type LookRow = { link: string | null; input: unknown; output: unknown };

/** A devlog media look as the review reads it. */
export const lookLine = ({ link, input, output }: LookRow) =>
	mediaLine(
		link,
		(output as { shows: string | null }).shows,
		(input as { unread: string | null }).unread,
	);

/** An artifact look as the review and the goal check read it. */
export const artifactLine = ({ link, input, output }: LookRow) => {
	const read = input as JournalRead;
	return `${read.artifactType ?? "Artifact"} "${read.artifactName ?? ""}" ${mediaLine(
		link,
		(output as { shows: string | null }).shows,
		read.unread,
	).slice(2)}`;
};

/**
 * A sprint's artifacts that prove no task — its build video, a document, an
 * image — looked at once each, inside the sprint's video budget, so the review
 * reads what the team showed beside its tasks.
 */
export async function seeSprintArtifacts(checkpointId: string, sprint: number) {
	const beside = await sprintArtifactsBeside(checkpointId, sprint);
	if (!beside) return;

	const looks = await sprintLooks(checkpointId, sprint);
	await lookAtArtifacts(
		checkpointId,
		sprint,
		artifactPicks(beside, looks),
		looks,
	);
}

/**
 * The artifacts to look at, oldest first: each link not looked at yet in the
 * step, inside its artifact budget. A rebuild (GDHUB-156) passes no looks.
 */
export const artifactPicks = <T extends { link: string }>(
	artifacts: T[],
	looks: { kind: CheckpointJournalKind; link: string | null }[],
) => {
	const looked = looks.filter(
		(look) => look.kind === CheckpointJournalKind.Artifact,
	);
	const seen = new Set(looked.map((look) => look.link));
	return artifacts
		.filter((artifact) => !seen.has(artifact.link))
		.slice(0, Math.max(0, ARTIFACTS_PER_SPRINT - looked.length));
};

/** A sprint's artifacts that prove no task, oldest first; null before the start. */
export async function sprintArtifactsBeside(
	checkpointId: string,
	sprint: number,
) {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			projectId: true,
			startedAt: true,
			items: { select: { evidence: { select: { artifactId: true } } } },
		},
	});
	if (!checkpoint?.startedAt) return null;
	const range = sprintRange(checkpoint.startedAt, sprint);
	const proving = new Set(
		checkpoint.items.flatMap((item) =>
			item.evidence.map((piece) => piece.artifactId),
		),
	);
	return (
		await prisma.projectArtifact.findMany({
			where: {
				projectId: checkpoint.projectId,
				createdAt: { gte: range.from, lt: dateOfDay(range.to, 2) },
			},
			orderBy: { createdAt: "asc" },
			select: { id: true, link: true, type: true, name: true },
		})
	).filter((artifact) => !proving.has(artifact.id));
}

/** Reads each artifact once and journals what it shows, inside the video budget left. */
async function lookAtArtifacts(
	checkpointId: string,
	sprint: number,
	artifacts: { link: string; type: string; name: string | null }[],
	looks: { input: unknown }[],
) {
	let left = SPRINT_VIDEO_SECONDS - videoSecondsOf(looks);
	for (const artifact of artifacts) {
		const look = await artifactLook(checkpointId, sprint, artifact, left);
		if (!look) continue;
		left -= look.videoSeconds;
		await journal(look.row);
	}
}

/**
 * Day 1 (GDHUB-133): the artifacts the author listed as already there, looked
 * at once each as sprint 0, so the goal check and picture 0 know what they hold.
 */
export async function seeInputArtifacts(checkpointId: string) {
	const looks = await sprintLooks(checkpointId, 0);
	// Day one's devlog media share sprint 0 (GDHUB-156) but not its artifact count.
	const artifacts = artifactPicks(await inputArtifacts(checkpointId), looks);
	await lookAtArtifacts(checkpointId, 0, artifacts, looks);
}

/** The artifacts the author listed as already there on day 1. */
export const inputArtifacts = async (checkpointId: string) =>
	(
		await prisma.checkpointItemEvidence.findMany({
			where: { item: { checkpointId, kind: CheckpointItemKind.Input } },
			orderBy: { createdAt: "asc" },
			select: { artifact: { select: { link: true, type: true, name: true } } },
		})
	).map((piece) => piece.artifact);

/**
 * The images and videos of day one's devlogs to look at (GDHUB-156): the
 * newest devlogs first, each link once, inside the sprint's media budget.
 */
export const dayOneMediaPicks = <T extends MediaDevlog>(
	devlogs: T[],
	seen: Set<string>,
	budget: number,
) => mediaPicks([...devlogs].reverse(), seen, budget);

/**
 * Day 1 (GDHUB-156): the media of the devlogs written before the checkpoint,
 * the most recent first, looked at once each as sprint 0 — the text of every
 * one of them goes to the goal check as it is.
 */
export async function seeDayOneDevlogMedia(checkpointId: string) {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: { id: true, projectId: true, startedAt: true },
	});
	if (!checkpoint) return;
	const [devlogs, looks] = await Promise.all([
		dayOneDevlogs(checkpoint),
		sprintLooks(checkpointId, 0),
	]);
	const looked = looks.filter(
		(look) => look.kind === CheckpointJournalKind.DevlogMedia,
	);
	const picks = dayOneMediaPicks(
		devlogs,
		new Set(looked.map(seenKey)),
		DEVLOG_MEDIA_PER_SPRINT - looked.length,
	);
	await lookAtMedia(checkpointId, 0, picks, looks);
}

/** What a sprint's other artifacts show, one line each, for its review. */
export async function sprintArtifactLines(
	checkpointId: string,
	sprint: number,
) {
	await seeSprintArtifacts(checkpointId, sprint);
	return lookedArtifactLines(checkpointId, sprint);
}

/** What was already seen in a sprint's artifacts, without looking again; sprint 0 is the day-1 inputs. */
export async function lookedArtifactLines(
	checkpointId: string,
	sprint: number,
) {
	const looked = await prisma.checkpointJournalEntry.findMany({
		where: { checkpointId, sprint, kind: CheckpointJournalKind.Artifact },
		orderBy: { createdAt: "asc" },
		select: { link: true, input: true, output: true },
	});
	return looked.map(artifactLine);
}
