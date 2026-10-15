import { openai } from "@ai-sdk/openai";
import type { CheckpointVerdict } from "@gdhub-io/gdhub-prisma";
import { generateText, Output } from "ai";
import { stripIndents } from "common-tags";
import { z } from "zod";
import { AI_MODELS } from "@/config/ai-models";
import {
	artifactLines,
	type CuratorTask,
	taskLine,
} from "@/services/call-notes";
import { type CallNotes, TASK_ADVICE_KINDS } from "@/types/checkpoints";

export type { CuratorTask };

export type PlanAdviceInput = {
	goal: string;
	stage: string;
	tasks: CuratorTask[];
	/** Day 1 sets the tasks; day 15 changes them for the last time. */
	moment: "start" | "midway";
	/** Midway: what the first two sprints showed. */
	review: string | null;
};

export type SprintReviewInput = {
	goal: string;
	stage: string;
	/** The sprint looked back at, 1–4. */
	sprint: number;
	tasks: CuratorTask[];
	devlog: string | null;
	artifacts: { type: string; name: string | null }[];
	/** Who on the team confirmed working in the sprint, and who did not. */
	pulse: { worked: number; missing: number };
	focusLastReview: string[];
	/** Day 29: the verdict already settled, for the letter to agree with it. */
	verdict: { verdict: CheckpointVerdict; note: string } | null;
};

const VOICE = stripIndents`
	You are the AI curator of a game team on GDHub, through a 28-day checkpoint:
	a goal, four one-week sprints, a review after each and a verdict at the end.
	You stand in for a human curator's calls, so you talk to the team directly,
	warmly and plainly, as someone who read everything they made.
	Plain English, short sentences, no filler, no praise without a reason.
	Use only task ids given to you.
`;

// Nullable rather than optional: strict structured outputs require every key.
const adviceSchema = z.object({
	message: z
		.string()
		.describe(
			"A short letter to the team, three or four sentences, about the tasks as a whole and what to do now.",
		),
	tasks: z.array(
		z.object({
			itemId: z.string(),
			kind: z
				.enum(TASK_ADVICE_KINDS)
				.describe(
					"clear: checkable and fits; risky: may not fit the time left; vague: nobody could check it is done; shorten: keep it smaller; cut: drop it; onTrack: going as planned.",
				),
			note: z
				.string()
				.describe(
					'One sentence the author acts on: what to do with the task, then why — "Drop it: …", "Keep it: …", "Move it to sprint 3: …". There are no buttons; this sentence is the whole advice.',
				),
			suggestion: z
				.string()
				.nullable()
				.describe(
					"For vague and shorten: the task reworded, ready to use. Null otherwise.",
				),
		}),
	),
	add: z
		.array(z.string())
		.describe(
			"Up to three tasks worth adding, each ending in something anyone can open. Empty when nothing is missing.",
		),
});

/**
 * The curator's read of the tasks, asked when the author saves them: on the
 * first days, and once more after the sprint 2 review. Advice only — the
 * author takes it or leaves it. Null when the model gives nothing usable.
 */
export const writePlanAdvice = async (input: PlanAdviceInput) => {
	const { output } = await generateText({
		model: openai(AI_MODELS.curatorReview),
		output: Output.object({ schema: adviceSchema, name: "plan_advice" }),
		instructions: stripIndents`
			${VOICE}

			Read the team's tasks against the goal and the time left. A good task
			ends in something anyone can open — a build, a document, a video —
			and fits the weeks it has. Give one entry per open task (not done,
			not cut).
			${
				input.moment === "start"
					? "This is the start: four weeks lie ahead. Your letter is the team's first word from you: open it with a short greeting — you are their AI curator for the next 28 days — then go on to the tasks."
					: "This is halfway, after the sprint 2 review: two weeks are left and this is the last change to the tasks. Prefer shortening and cutting to adding."
			}
		`,
		prompt: stripIndents`
			Stage: ${input.stage}
			Goal: ${input.goal}

			Tasks:
			${input.tasks.length ? input.tasks.map(taskLine).join("\n") : "(none yet)"}

			${input.review ? `What the sprints so far showed:\n${input.review}` : ""}
		`,
	});
	return output ?? null;
};

const reviewSchema = z.object({
	message: z
		.string()
		.describe(
			"A letter to the team, three to five sentences: what went well, what worries you, what to do next. On the final review, it agrees with the verdict.",
		),
	inShort: z
		.string()
		.describe(
			"Two or three sentences: how the sprint went — what landed, what did not, the main risk.",
		),
	discussed: z
		.array(z.object({ itemId: z.string(), text: z.string() }))
		.describe(
			"Per task with something to say, in plan order: what the sprint showed for it.",
		),
	notDiscussed: z
		.array(z.string())
		.describe("Ids of open tasks with nothing to show yet."),
	outsidePlan: z
		.array(z.string())
		.describe("Work shown that belongs to no task."),
	agreed: z
		.array(
			z.object({
				text: z.string(),
				itemId: z.string().nullable(),
				dueDay: z.number().int().nullable(),
			}),
		)
		.describe(
			"The focus for the next sprint, two or three lines; dueDay stays null. Empty on the final review.",
		),
	questions: z
		.array(z.string())
		.describe("Questions the team should answer for itself."),
});

/**
 * The review of one sprint, from what the team showed in it. The review
 * reads only the sprint's devlog, artifacts and pulse: nothing was said, so
 * nothing is retold. Null when the model gives nothing usable.
 */
export const writeSprintReview = async (input: SprintReviewInput) => {
	const final = input.verdict !== null;
	const { output } = await generateText({
		model: openai(AI_MODELS.curatorReview),
		output: Output.object({ schema: reviewSchema, name: "sprint_review" }),
		instructions: stripIndents`
			${VOICE}

			Review sprint ${input.sprint} from what the team showed: its devlog,
			the artifacts it added and who confirmed working. Judge by what
			anyone can open, not by intentions. A task is done only when an
			artifact closes it.
			${final ? "This is the final review: the 28 days are over and the verdict is settled." : ""}
		`,
		prompt: stripIndents`
			Stage: ${input.stage}
			Goal: ${input.goal}

			Tasks:
			${input.tasks.map(taskLine).join("\n")}

			${input.focusLastReview.length ? `Focus set for this sprint:\n${input.focusLastReview.map((line) => `- ${line}`).join("\n")}` : ""}

			${input.devlog ? `The sprint's devlog:\n${input.devlog}` : "No devlog for the sprint."}

			${artifactLines(input.artifacts) || "No artifacts added in the sprint."}

			Pulse: ${input.pulse.worked} confirmed working, ${input.pulse.missing} did not.

			${input.verdict ? `Verdict: ${input.verdict.verdict}. ${input.verdict.note}` : ""}
		`,
	});
	if (!output) return null;
	const { message, ...notes } = output;
	return { message, notes: notes satisfies CallNotes };
};
