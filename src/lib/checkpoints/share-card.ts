import { CheckpointVerdict } from "@/config/prisma-enums";

/**
 * The words of the verdict share card (GDHUB-144, Pen 12.20). The card is an
 * image drawn on the server, in English like the rest of the platform; the
 * post text the author edits starts from the same words.
 */

export const SHARE_VERDICT_LABEL: Record<CheckpointVerdict, string> = {
	[CheckpointVerdict.StageClosed]: "Ready for the next stage",
	[CheckpointVerdict.GoalMet]: "Goal met",
	[CheckpointVerdict.GoalMissed]: "Goal missed",
};

/** "Checkpoint 4 passed on the road to the release"; a missed goal is "done", never "passed". */
export const roadLine = (number: number, verdict: CheckpointVerdict) => {
	const passed = verdict === CheckpointVerdict.GoalMissed ? "done" : "passed";
	return number === 1
		? `The first checkpoint ${passed} on the road to the release`
		: `Checkpoint ${number} ${passed} on the road to the release`;
};

/** The post the share window starts from: what happened, who said what, and the project's page if asked. */
export const sharePost = ({
	number,
	verdict,
	project,
	curator,
	line,
	link,
}: {
	number: number;
	verdict: CheckpointVerdict;
	project: string;
	/** The character's name; null when the AI curator plays none. */
	curator: string | null;
	line: string;
	link: string;
}) =>
	`${roadLine(number, verdict)} of my game, ${project}: ${SHARE_VERDICT_LABEL[verdict].toLowerCase()}. ${curator ? `${curator}, my AI curator` : "My AI curator"}: “${line}”\n${link}`;

/** Bump when the card is drawn differently, so browsers drop the old picture. */
const DRAWING = 2;

/** The card image's version: what it shows and how it is drawn, so a cached copy is never stale. */
export const shareImageVersion = (line: string, cover: string | null) =>
	[...`${DRAWING}|${line}|${cover ?? ""}`]
		.reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7)
		.toString(36);
