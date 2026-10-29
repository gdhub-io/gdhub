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
import type { AiMeter } from "@/services/ai-usage";
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
) =>
	readEvidence(artifact.link, {
		videoSecondsLeft,
		pageOnly: artifact.type === ProjectArtifactType.ExecutableBuild,
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
) => (readable(content) ? describeMedia(content, meter, locale) : null);

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
		select: {
			id: true,
			seenLink: true,
			item: { select: { id: true, text: true } },
			artifact: {
				select: { type: true, name: true, description: true, link: true },
			},
		},
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

		const content = await readArtifact(artifact, left).catch((error) => {
			console.error("[evidence] read failed", piece.id, error);
			return null;
		});
		if (!content) continue;
		left -= content.videoSeconds;

		const task = {
			task: item.text,
			artifactType: artifact.type,
			artifactName: artifact.name,
			description: artifact.description,
		};
		devlogs ??= (
			await prisma.projectReport.findMany({
				where: { checkpointId },
				orderBy: { publishedAt: "asc" },
				select: { content: true, contentEditor: true },
			})
		).map(devlogWords);
		const judged = await judgeRead({ ...task, devlogs }, content, {
			checkpointId,
			purpose: "evidence",
		}).catch((error) => {
			console.error("[evidence] judge failed", piece.id, error);
			return null;
		});
		if (!judged) continue;

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
		await journal({
			checkpointId,
			kind: CheckpointJournalKind.Evidence,
			sprint,
			link: artifact.link,
			itemId: item.id,
			input: { ...task, ...whatWasRead(artifact.link, content) },
			output: judged,
		});
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
	const seen = new Set(
		looked.filter((row) => row.devlogId === devlogId).map((row) => row.link),
	);
	const links = devlogMediaLinks(post)
		.filter((link) => !seen.has(link))
		.slice(0, Math.max(0, DEVLOG_MEDIA_PER_SPRINT - looked.length));

	let left = SPRINT_VIDEO_SECONDS - videoSecondsOf(looks);
	for (const link of links) {
		const content = await readEvidence(link, { videoSecondsLeft: left }).catch(
			() => null,
		);
		if (!content) continue;
		left -= content.videoSeconds;

		const shows = await describeRead(content, {
			checkpointId,
			purpose: "evidence",
		}).catch(() => null);
		await journal({
			checkpointId,
			kind: CheckpointJournalKind.DevlogMedia,
			sprint,
			link,
			devlogId,
			input: {
				devlog: capped(post.content, 80),
				...whatWasRead(link, content),
			},
			output: { shows },
		});
	}
}

/**
 * What the images and videos in a sprint's devlogs show, one line each, for the
 * sprint review: read from the journal, after looking at anything missed.
 */
export async function devlogMediaLines(devlogIds: string[]) {
	for (const id of devlogIds) await seeDevlogMedia(id);

	const looked = await prisma.checkpointJournalEntry.findMany({
		where: {
			devlogId: { in: devlogIds },
			kind: CheckpointJournalKind.DevlogMedia,
		},
		orderBy: { createdAt: "asc" },
		select: { link: true, input: true, output: true },
	});
	return looked.map(({ link, input, output }) =>
		mediaLine(
			link,
			(output as { shows: string | null }).shows,
			(input as { unread: string | null }).unread,
		),
	);
}

/**
 * A sprint's artifacts that prove no task — its build video, a document, an
 * image — looked at once each, inside the sprint's video budget, so the review
 * reads what the team showed beside its tasks.
 */
export async function seeSprintArtifacts(checkpointId: string, sprint: number) {
	const checkpoint = await prisma.projectCheckpoint.findUnique({
		where: { id: checkpointId },
		select: {
			projectId: true,
			startedAt: true,
			items: { select: { evidence: { select: { artifactId: true } } } },
		},
	});
	if (!checkpoint?.startedAt) return;
	const range = sprintRange(checkpoint.startedAt, sprint);
	const proving = new Set(
		checkpoint.items.flatMap((item) =>
			item.evidence.map((piece) => piece.artifactId),
		),
	);

	const looks = await sprintLooks(checkpointId, sprint);
	const looked = looks.filter(
		(look) => look.kind === CheckpointJournalKind.Artifact,
	);
	const seen = new Set(looked.map((look) => look.link));
	const artifacts = (
		await prisma.projectArtifact.findMany({
			where: {
				projectId: checkpoint.projectId,
				createdAt: { gte: range.from, lt: dateOfDay(range.to, 2) },
			},
			orderBy: { createdAt: "asc" },
			select: { id: true, link: true, type: true, name: true },
		})
	)
		.filter((artifact) => !proving.has(artifact.id) && !seen.has(artifact.link))
		.slice(0, Math.max(0, ARTIFACTS_PER_SPRINT - looked.length));

	let left = SPRINT_VIDEO_SECONDS - videoSecondsOf(looks);
	for (const artifact of artifacts) {
		const content = await readArtifact(artifact, left).catch(() => null);
		if (!content) continue;
		left -= content.videoSeconds;

		const shows = await describeRead(content, {
			checkpointId,
			purpose: "evidence",
		}).catch(() => null);
		await journal({
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
		});
	}
}

/** What a sprint's other artifacts show, one line each, for its review. */
export async function sprintArtifactLines(
	checkpointId: string,
	sprint: number,
) {
	await seeSprintArtifacts(checkpointId, sprint);
	const looked = await prisma.checkpointJournalEntry.findMany({
		where: { checkpointId, sprint, kind: CheckpointJournalKind.Artifact },
		orderBy: { createdAt: "asc" },
		select: { link: true, input: true, output: true },
	});
	return looked.map(({ link, input, output }) => {
		const read = input as JournalRead;
		return `${read.artifactType ?? "Artifact"} "${read.artifactName ?? ""}" ${mediaLine(
			link,
			(output as { shows: string | null }).shows,
			read.unread,
		).slice(2)}`;
	});
}
