import { stripIndents } from "common-tags";
import { z } from "zod";
import type { CheckpointVerdict } from "@/config/prisma-enums";
import { fenced } from "@/lib/checkpoints/curator-text";
import type { AiMeter } from "@/services/ai-usage";
import { runStructured } from "@/services/checkpoints/ai-review";
import { PARTICIPANT_DATA, renderCharacter } from "./prompts/card";

type ShareLineInput = {
	character?: string | null;
	project: { name: string; pitch: string | null };
	number: number;
	stage: string;
	goal: string;
	/** The settled verdict, after the rule — never the model's proposal. */
	verdict: CheckpointVerdict;
	verdictNote: string | null;
	devlogs: string[];
};

/** The card holds two short sentences; past this the schema refuses the line. */
const SHARE_LINE_MAX = 200;

const lineSchema = z.object({
	line: z
		.string()
		.max(SHARE_LINE_MAX)
		.describe("Two short sentences: the reaction, then the wish"),
});

/**
 * GDHUB-144: the line on the share card of a closed checkpoint, read by
 * strangers on LinkedIn, X or Telegram, not by the team — so not the verdict
 * note, which is written to the team. A playful reaction to the work, in the
 * character's voice, and a wish for what comes next.
 */
export const writeShareLine = async (
	input: ShareLineInput,
	meter?: AiMeter,
): Promise<string | null> => {
	try {
		const answer = await runStructured(
			"share_line",
			lineSchema,
			{
				instructions: stripIndents`
					${renderCharacter(input.character, "verdict")}

					You write the one line that goes on a public share card of a closed
					checkpoint: the team posts it to LinkedIn, X or Telegram. Strangers
					read it, not the team.
					- Two short sentences, at most ${SHARE_LINE_MAX} characters in all.
					- The first: your playful, evaluative reaction to what the team pulled
					  off — how it struck you, in your character's voice and world, with
					  one concrete detail of the game in it. A reaction, not a list of what
					  was done.
					- The second: a wish for the project's next steps, warm and specific to
					  where it stands now.
					- Honest about the verdict: tease kindly when the goal was missed,
					  never call it a win.
					- No stage names, no "goal", "tasks", "checkpoint" or "verdict", no
					  hashtags, no emoji, no quotes around it.
					Write in the language of the goal.

					${PARTICIPANT_DATA}
				`,
				prompt: stripIndents`
					Game: ${fenced(input.project.name)}${input.project.pitch ? ` — ${fenced(input.project.pitch)}` : ""}
					Checkpoint ${input.number}, stage ${input.stage}. Its goal: ${fenced(input.goal)}
					Verdict: ${input.verdict}. The verdict note you wrote for the team:
					${input.verdictNote ?? "(none)"}

					What the team wrote in its devlogs:
					${input.devlogs.length ? input.devlogs.map((post) => `- ${fenced(post)}`).join("\n") : "(nothing)"}
				`,
			},
			meter,
		);
		return answer?.line.trim() || null;
	} catch (error) {
		console.error("[checkpoint-curator] share line failed", error);
		return null;
	}
};
