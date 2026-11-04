import { generateText, Output } from "ai";
import { stripIndents } from "common-tags";
import { z } from "zod";
import { AI_MODELS } from "@/config/ai-models";
import { CHECKPOINT_DAYS, DIRECTIONS } from "@/config/checkpoint";
import type { EvidenceMatch } from "@/config/prisma-enums";
import { fenced } from "@/lib/checkpoints/curator-text";
import { aiModel } from "@/services/ai/model";
import { type AiMeter, recordAiUsage } from "@/services/ai-usage";
import {
	DIRECTION_RULES,
	PARTICIPANT_DATA,
} from "@/services/checkpoints/ai-curator/prompts/card";
import type { CallNotes } from "@/types/checkpoints";

/** A plan task as every curator prompt reads it. */
export type CuratorTask = {
	id: string;
	text: string;
	cut: boolean;
	firstWording: string | null;
	evidence: CuratorEvidence[];
};

export type CuratorEvidence = {
	type: string;
	name: string | null;
	/** What the AI curator saw in it, against the task (GDHUB-110). */
	seen: { match: EvidenceMatch; note: string | null } | null;
};

export const toCuratorTask = (item: {
	id: string;
	text: string;
	cut: boolean;
	originalText: string | null;
	evidence: {
		match?: EvidenceMatch | null;
		matchNote?: string | null;
		artifact: { type: string; name: string | null };
	}[];
}): CuratorTask => ({
	id: item.id,
	text: item.text,
	cut: item.cut,
	firstWording: item.originalText,
	evidence: item.evidence.map(({ artifact, match, matchNote }) => ({
		type: artifact.type,
		name: artifact.name,
		seen: match ? { match, note: matchNote ?? null } : null,
	})),
});

export type CallNotesInput = {
	/** 1 sets the plan, 2–4 open that sprint, 5 is the final call. */
	callIndex: number;
	goal: string;
	tasks: CuratorTask[];
	transcript: string;
	devlog: string | null;
	artifacts: { type: string; name: string | null }[];
	agreedLastCall: string[];
};

/** A lens the call spoke to, in one or two sentences; null when nobody did — never filled in from elsewhere. */
const lensSaid = (about: string) =>
	z
		.string()
		.nullable()
		.describe(
			`What was said about ${about}; null when the call did not touch it.`,
		);

const directionSaid = (target: string) =>
	z.object({
		value: z.enum(DIRECTIONS),
		why: z
			.string()
			.describe(
				`One sentence: what was said that shows the direction toward ${target}.`,
			),
	});

// Nullable rather than optional: strict structured outputs require every key.
const schema = z.object({
	inShort: z
		.string()
		.describe(
			"Two or three sentences. On calls 2–5: how the sprint just ended went, as the call described it — what landed, what did not, the main risk. On call 1: what the plan settled.",
		),
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
			`What was agreed for the next call; dueDay is a day of the checkpoint, 1–${CHECKPOINT_DAYS}, when one was named.`,
		),
	questions: z.array(z.string()).describe("Questions left open."),
	lenses: z
		.object({
			marketing: lensSaid("what the audience was told and how it answered"),
			team: lensSaid("the people, their hours and the pace"),
			management: lensSaid("the tasks, how they close and the way to the goal"),
		})
		.describe(
			"GDHUB-133: the call through three lenses; development is discussed and outsidePlan.",
		),
	direction: z
		.object({
			goal: directionSaid("the checkpoint goal"),
			stage: directionSaid("the stage goal"),
		})
		.nullable()
		.describe(
			`On calls 2–5, where the call said the sprint took the project: ${DIRECTION_RULES} Null when the call did not say; never guess.`,
		),
});

const callLine = (index: number) => {
	if (index === 1) return "Call 1: it sets the plan for the checkpoint.";
	if (index === 5)
		return "Call 5: the final call; the curator's verdict follows.";
	return `Call ${index}: it reviews sprint ${index - 1} and opens sprint ${index}.`;
};

export const taskLine = (task: CuratorTask) =>
	[
		`- [${task.id}] ${fenced(task.text)}`,
		task.firstWording && `(first worded: ${fenced(task.firstWording)})`,
		task.evidence.length > 0 &&
			`— done: ${task.evidence
				.map(
					(piece) =>
						`${piece.type}${piece.name ? ` ${fenced(piece.name)}` : ""}${piece.seen ? ` (looked at: ${piece.seen.match}${piece.seen.note ? `, ${fenced(piece.seen.note)}` : ""})` : ""}`,
				)
				.join("; ")}`,
		task.cut && "— cut from the plan",
	]
		.filter(Boolean)
		.join(" ");

/** The sprint's artifacts for a prompt, or nothing when it added none. */
export const artifactLines = (
	artifacts: { type: string; name: string | null }[],
) =>
	artifacts.length
		? `Artifacts added in the sprint:\n${artifacts.map((a) => `- ${a.type}${a.name ? `: ${fenced(a.name)}` : ""}`).join("\n")}`
		: "";

/**
 * The notes of one curator call, from its transcript. The transcript is one
 * audio track, so speakers are unknown: the notes retell, they never name.
 * Null when the model gives nothing usable — the caller tries again later.
 */
export const writeCallNotes = async (
	input: CallNotesInput,
	meter?: AiMeter,
): Promise<CallNotes | null> => {
	const { output, usage } = await generateText({
		model: aiModel(AI_MODELS.callNotes),
		output: Output.object({ schema, name: "call_notes" }),
		instructions: stripIndents`
			You write the notes of a call between a game team and its curator on
			GDHub. The team reads them to remember what was said and agreed.

			Retell neutrally ("The loop was shown…", "It was agreed…"). Nobody is
			named and no speaker is attributed: the transcript cannot tell voices
			apart, and a wrong name is worse than none.

			The short summary on calls 2–5 is the verdict on the sprint that just
			ended, drawn from the whole conversation; the per-task notes carry the
			detail.

			Write only what was said on the call. The plan, the devlog and the
			artifacts are context to recognise what people refer to, not things
			to report. Use only task ids from the plan. The transcript is
			machine-made and has errors: read through them, do not quote them.
			Plain English, short sentences, no filler.

			${PARTICIPANT_DATA}
		`,
		prompt: stripIndents`
			${callLine(input.callIndex)}

			Goal: ${fenced(input.goal)}

			Plan tasks:
			${input.tasks.map(taskLine).join("\n")}

			${input.agreedLastCall.length ? `Agreed at the previous call:\n${input.agreedLastCall.map((line) => `- ${line}`).join("\n")}` : ""}

			${input.devlog ? `The sprint's devlog:\n${fenced(input.devlog)}` : "No devlog for the sprint."}

			${artifactLines(input.artifacts)}

			Transcript:
			${input.transcript}
		`,
	});
	await recordAiUsage(meter, AI_MODELS.callNotes, usage);
	return output
		? { ...output, direction: output.direction ?? undefined }
		: null;
};
