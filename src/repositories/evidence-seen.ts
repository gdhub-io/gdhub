import {
	ArtifactCheckStatus,
	CheckpointItemKind,
	EvidenceMatch,
	ProjectArtifactType,
} from "@/config/prisma-enums";
import { describeMedia, judgeEvidence } from "@/services/evidence/judge";
import { readEvidence } from "@/services/evidence/read";
import { prisma } from "@/services/prisma";

/** Seconds of video looked at per sprint review (Dmitry, 2026-10-24). */
export const SPRINT_VIDEO_SECONDS = 10 * 60;
/** Devlog images and videos looked at per sprint. */
const DEVLOG_MEDIA_PER_SPRINT = 6;

/**
 * Look at the evidence on a checkpoint's tasks that has not been looked at yet,
 * and judge each against its task. Runs before a review, so a sprint's budget
 * of video is spent once. A new link on an artifact is looked at again; the same
 * link never is. Returns the seconds of video it used.
 */
export async function seeCheckpointEvidence(
	checkpointId: string,
	videoSeconds = SPRINT_VIDEO_SECONDS,
) {
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

	let left = videoSeconds;
	for (const item of items) {
		const { artifact } = item;
		if (!artifact || item.evidenceSeenLink === artifact.link) continue;

		const content = await readEvidence(artifact.link, {
			videoSecondsLeft: left,
			// A build's page is read; the build itself never is.
			pageOnly: artifact.type === ProjectArtifactType.ExecutableBuild,
		}).catch((error) => {
			console.error("[evidence] read failed", item.id, error);
			return null;
		});
		if (!content) continue;
		left -= content.videoSeconds;

		// Nothing readable: the answer is CannotTell, and it costs no model call.
		const judged =
			!content.text && !content.images.length
				? { match: EvidenceMatch.CannotTell, note: content.unread }
				: await judgeEvidence(
						{
							task: item.text,
							artifactType: artifact.type,
							artifactName: artifact.name,
							description: artifact.description,
						},
						content,
						{ checkpointId, purpose: "evidence" },
					).catch((error) => {
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
	}

	return videoSeconds - left;
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
 * What the images and videos in a sprint's devlogs show, one line each, for the
 * sprint review. Not stored: each review looks at its own sprint's devlogs.
 */
export async function describeDevlogMedia(
	checkpointId: string,
	devlogs: { content: string; video: string | null; contentEditor: unknown }[],
	videoSeconds: number,
) {
	const links = devlogs
		.flatMap(devlogMediaLinks)
		.slice(0, DEVLOG_MEDIA_PER_SPRINT);

	let left = videoSeconds;
	const lines: string[] = [];
	for (const link of links) {
		const content = await readEvidence(link, { videoSecondsLeft: left }).catch(
			() => null,
		);
		if (!content) continue;
		left -= content.videoSeconds;

		if (!content.text && !content.images.length) {
			lines.push(`- ${link}: not read — ${content.unread}`);
			continue;
		}
		const seen = await describeMedia(content, {
			checkpointId,
			purpose: "evidence",
		}).catch(() => null);
		if (seen) {
			lines.push(
				`- ${link}: ${seen}${content.unread ? ` (${content.unread})` : ""}`,
			);
		}
	}
	return lines;
}
