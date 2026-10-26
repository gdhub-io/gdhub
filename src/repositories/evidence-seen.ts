import { CHECKPOINT_RUNNING_STATUSES } from "@/config/checkpoint";
import {
	ArtifactCheckStatus,
	CheckpointItemKind,
	CheckpointJournalKind,
	EvidenceMatch,
	ProjectArtifactType,
} from "@/config/prisma-enums";
import { isRunning } from "@/lib/checkpoint-refund";
import { currentSprint, sprintOfDate } from "@/lib/checkpoint-sprints";
import { capped } from "@/lib/curator-text";
import { checkArtifact } from "@/repositories/artifact-check";
import {
	journal,
	sprintLooks,
	videoSecondsOf,
} from "@/repositories/curator-journal";
import type { AiMeter } from "@/services/ai-usage";
import {
	describeMedia,
	type EvidenceTask,
	judgeEvidence,
} from "@/services/evidence/judge";
import { readableLink } from "@/services/evidence/links";
import { type EvidenceContent, readEvidence } from "@/services/evidence/read";
import { prisma } from "@/services/prisma";

/** Seconds of video looked at per sprint (Dmitry, 2026-10-24). */
export const SPRINT_VIDEO_SECONDS = 10 * 60;
/** Devlog images and videos looked at per sprint. */
const DEVLOG_MEDIA_PER_SPRINT = 6;
/** What the journal keeps of a document's text. */
const JOURNAL_TEXT_CHARS = 2000;

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
	devlog?: string;
};

const readable = (content: EvidenceContent) =>
	!!content.text || content.images.length > 0;

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

	const items = await prisma.checkpointItem.findMany({
		where: {
			checkpointId,
			kind: CheckpointItemKind.Outcome,
			cut: false,
			artifact: { checkStatus: ArtifactCheckStatus.Readable },
		},
		orderBy: { order: "asc" },
		select: {
			id: true,
			text: true,
			evidenceSeenLink: true,
			artifact: {
				select: { type: true, name: true, description: true, link: true },
			},
		},
	});

	let left =
		SPRINT_VIDEO_SECONDS -
		videoSecondsOf(await sprintLooks(checkpointId, sprint));
	for (const item of items) {
		const { artifact } = item;
		if (!artifact || item.evidenceSeenLink === artifact.link) continue;

		const content = await readArtifact(artifact, left).catch((error) => {
			console.error("[evidence] read failed", item.id, error);
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
				select: { content: true },
			})
		).map((post) => post.content);
		const judged = await judgeRead({ ...task, devlogs }, content, {
			checkpointId,
			purpose: "evidence",
		}).catch((error) => {
			console.error("[evidence] judge failed", item.id, error);
			return null;
		});
		if (!judged) continue;

		await prisma.checkpointItem.update({
			where: { id: item.id },
			data: {
				evidenceMatch: judged.match,
				evidenceMatchNote: judged.note,
				evidenceSeenLink: artifact.link,
			},
		});
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
	const uses = await prisma.checkpointItem.findMany({
		where: {
			artifactId,
			checkpoint: { status: { in: CHECKPOINT_RUNNING_STATUSES } },
		},
		distinct: ["checkpointId"],
		select: { checkpointId: true },
	});
	for (const { checkpointId } of uses) {
		await seeCheckpointEvidence(checkpointId);
	}
}

type EditorBlock = { type?: string; data?: Record<string, unknown> };

const MEDIA_LINK =
	/https?:\/\/[^\s)"'<>]+\.(?:png|jpe?g|gif|webp|mp4|webm|mov)(?:\?[^\s)"'<>]*)?|https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|vimeo\.com|drive\.google\.com|dropbox\.com)\/[^\s)"'<>]+/gi;

/** The images and videos a devlog carries: uploads, embeds, its video and media links in the text. */
export const devlogMediaLinks = (post: {
	content: string;
	video: string | null;
	contentEditor: unknown;
}) => {
	const blocks =
		(post.contentEditor as { blocks?: EditorBlock[] } | null)?.blocks ?? [];
	const fromBlocks = blocks.flatMap((block) => {
		const data = block.data ?? {};
		if (block.type === "image") {
			const url = (data.file as { url?: string } | undefined)?.url;
			return url ? [url] : [];
		}
		if (block.type === "embed" && typeof data.source === "string") {
			return [data.source];
		}
		return [];
	});
	const fromText = post.content.match(MEDIA_LINK) ?? [];

	return [
		...new Set([
			...(post.video ? [post.video] : []),
			...fromBlocks,
			...fromText,
		]),
	];
};

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

/** One devlog image or video as the sprint review reads it. */
export const mediaLine = (
	link: string | null,
	shows: string | null,
	unread: string | null,
) =>
	shows
		? `- ${link}: ${shows}${unread ? ` (${unread})` : ""}`
		: `- ${link}: not read — ${unread ?? "nothing readable"}`;
