import { AI_CURATOR_AVATAR } from "@/config/checkpoint";
import { characterFace } from "@/lib/checkpoints/curator-characters";
import { shareImageVersion } from "@/lib/checkpoints/share-card";
import {
	getShareLineContext,
	getShareSource,
	keepShareLine,
	type ShareSource,
} from "@/repositories/checkpoints/share";
import { writeShareLine } from "@/services/checkpoints/ai-curator/share-line";
import type { ShareCardDto } from "@/types/checkpoints";

/**
 * The verdict share card of a closed AI checkpoint (GDHUB-144). Its line is
 * written the first time someone on the team opens "Share the result", from
 * the settled verdict on the checkpoint — the rule's, not the model's
 * proposal — and kept, so every later open reads it back without a model call.
 */
export const shareCardOf = async (
	checkpointId: string,
	userId: string,
): Promise<ShareCardDto | null> => {
	const source = await getShareSource(checkpointId, userId);
	if (!source) return null;

	const line = source.shareLine ?? (await writeLine(source));
	if (!line) return null;

	const face = characterFace(source.character);
	return {
		number: source.number,
		verdict: source.verdict,
		decidedAt: source.decidedAt?.toISOString() ?? null,
		line,
		curator: {
			name: face?.name ?? null,
			avatar: face?.avatar ?? AI_CURATOR_AVATAR,
		},
		project: {
			name: source.project.name,
			slug: source.project.slug,
			cover: source.project.cover,
		},
		image: `/api/checkpoint/${checkpointId}/share/image?v=${shareImageVersion(line, source.project.cover)}`,
	};
};

const writeLine = async (source: ShareSource) => {
	const context = await getShareLineContext(source.id);
	const line = await writeShareLine(
		{
			character: source.character,
			project: { name: source.project.name, pitch: context.pitch },
			number: source.number,
			stage: source.stage,
			goal: context.goal,
			verdict: source.verdict,
			verdictNote: context.verdictNote,
			devlogs: context.devlogs,
		},
		{ checkpointId: source.id, purpose: "shareLine" },
	);
	return line ? keepShareLine(source.id, line) : null;
};
