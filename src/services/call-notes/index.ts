import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { stripIndents } from "common-tags";
import { z } from "zod";
import { AI_MODELS } from "@/config/ai-models";
import type { CallNotes } from "@/types/checkpoints";

export type CallNotesInput = {
	/** 1 sets the plan, 2–4 open that sprint, 5 is the final call. */
	callIndex: number;
	goal: string;
	tasks: {
		id: string;
		text: string;
		done: { type: string; name: string | null } | null;
		cut: boolean;
		firstWording: string | null;
	}[];
	transcript: string;
	devlog: string | null;
	artifacts: { type: string; name: string | null }[];
	agreedLastCall: string[];
};

// Nullable rather than optional: strict structured outputs require every key.
const schema = z.object({
	inShort: z
		.string()
		.describe("Two or three sentences: what the call settled."),
	discussed: z
		.array(z.object({ itemId: z.string(), text: z.string() }))
		.describe("Per task that came up, in plan order: what was said about it."),
	notDiscussed: z
		.array(z.string())
		.describe("Ids of plan tasks nobody raised."),
	outsidePlan: z
		.array(z.string())
		.describe("Things discussed that belong to no task."),
	agreed: z
		.array(
			z.object({
				text: z.string(),
				itemId: z.string().nullable(),
				dueDay: z.number().int().nullable(),
			}),
		)
		.describe(
			"What was agreed for the next call; dueDay is a day of the checkpoint, 1–28, when one was named.",
		),
	questions: z.array(z.string()).describe("Questions left open."),
});

const callLine = (index: number) => {
	if (index === 1) return "Call 1: it sets the plan for the checkpoint.";
	if (index === 5)
		return "Call 5: the final call; the curator's verdict follows.";
	return `Call ${index}: it reviews sprint ${index - 1} and opens sprint ${index}.`;
};

const taskLine = (task: CallNotesInput["tasks"][number]) =>
	[
		`- [${task.id}] ${task.text}`,
		task.firstWording && `(first worded: ${task.firstWording})`,
		task.done &&
			`— done: ${task.done.type}${task.done.name ? ` "${task.done.name}"` : ""}`,
		task.cut && "— cut from the plan",
	]
		.filter(Boolean)
		.join(" ");

/**
 * The notes of one curator call, from its transcript. The transcript is one
 * audio track, so speakers are unknown: the notes retell, they never name.
 * Null when the model gives nothing usable — the caller tries again later.
 */
export const writeCallNotes = async (
	input: CallNotesInput,
): Promise<CallNotes | null> => {
	const { output } = await generateText({
		model: openai(AI_MODELS.callNotes),
		output: Output.object({ schema, name: "call_notes" }),
		instructions: stripIndents`
			You write the notes of a call between a game team and its curator on
			GDHub. The team reads them to remember what was said and agreed.

			Retell neutrally ("The loop was shown…", "It was agreed…"). Nobody is
			named and no speaker is attributed: the transcript cannot tell voices
			apart, and a wrong name is worse than none.

			Write only what was said on the call. The plan, the devlog and the
			artifacts are context to recognise what people refer to, not things
			to report. Use only task ids from the plan. The transcript is
			machine-made and has errors: read through them, do not quote them.
			Plain English, short sentences, no filler.
		`,
		prompt: stripIndents`
			${callLine(input.callIndex)}

			Goal: ${input.goal}

			Plan tasks:
			${input.tasks.map(taskLine).join("\n")}

			${input.agreedLastCall.length ? `Agreed at the previous call:\n${input.agreedLastCall.map((line) => `- ${line}`).join("\n")}` : ""}

			${input.devlog ? `The sprint's devlog:\n${input.devlog}` : "No devlog for the sprint."}

			${input.artifacts.length ? `Artifacts added in the sprint:\n${input.artifacts.map((a) => `- ${a.type}${a.name ? `: ${a.name}` : ""}`).join("\n")}` : ""}

			Transcript:
			${input.transcript}
		`,
	});
	return output ?? null;
};
