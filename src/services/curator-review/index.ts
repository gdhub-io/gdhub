import { openai } from "@ai-sdk/openai";
import type { CheckpointVerdict } from "@gdhub-io/gdhub-prisma";
import { generateText, Output } from "ai";
import { stripIndents } from "common-tags";
import { z } from "zod";
import { AI_MODELS } from "@/config/ai-models";
import { devlogText } from "@/lib/curator-text";
import { traceGenerated } from "@/services/ai-trace";
import { type AiMeter, recordAiUsage } from "@/services/ai-usage";
import {
	artifactLines,
	type CuratorTask,
	taskLine,
} from "@/services/call-notes";
import {
	AUTHOR_VOICE,
	localeLine,
	renderPicture,
} from "@/services/checkpoint-curator/prompts/card";
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
	/** The project as its page shows it: the stage's path, the team, recent activity. */
	picture: string;
};

export type SprintReviewInput = {
	goal: string;
	stage: string;
	/** The sprint looked back at, 1–4. */
	sprint: number;
	tasks: CuratorTask[];
	/** Every devlog posted in the sprint, oldest first. */
	devlogs: string[];
	/** What the images and videos in those devlogs show, one line each. */
	devlogMedia: string[];
	artifacts: { type: string; name: string | null }[];
	/** The roles on the team that confirmed working in the sprint, and that did not. */
	pulse: { worked: string[]; missing: string[] };
	focusLastReview: string[];
	/** Day 29: the verdict already settled, for the letter to agree with it. */
	verdict: { verdict: CheckpointVerdict; note: string } | null;
	picture: string;
};

const roles = (list: string[]) => (list.length ? ` (${list.join(", ")})` : "");

/** Who confirmed working, by role: a missing artist explains a missing board. */
const pulseLine = (pulse: SprintReviewInput["pulse"]) =>
	`${pulse.worked.length} confirmed working${roles(pulse.worked)}, ${pulse.missing.length} did not${roles(pulse.missing)}.`;

const VOICE = stripIndents`
	You are the AI curator of a game team on GDHub, through a 28-day checkpoint:
	a goal, four one-week sprints, a review after each and a verdict at the end.
	You stand in for a human curator's calls, so you talk to the team directly,
	warmly and plainly, as someone who read everything they made.
	Plain English unless told otherwise, no filler, no praise without a reason.
	Use only task ids given to you.

	${AUTHOR_VOICE}
`;

// Nullable rather than optional: strict structured outputs require every key.
const adviceSchema = z.object({
	message: z
		.string()
		.describe(
			"A short letter to the team, three or four sentences, about the tasks as a whole and what to do now. Last sentence, in the first person: I am back at the next sprint review and follow your devlogs until then.",
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
export const writePlanAdvice = async (
	input: PlanAdviceInput,
	meter?: AiMeter,
	locale?: string,
) => {
	const request = {
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
			${locale ? localeLine(locale) : ""}
		`,
		prompt: stripIndents`
			Stage: ${input.stage}
			Goal: ${input.goal}

			Tasks:
			${input.tasks.length ? input.tasks.map(taskLine).join("\n") : "(none yet)"}

			${input.review ? `What the sprints so far showed:\n${input.review}` : ""}

			${renderPicture(input.picture)}
		`,
	};
	const started = Date.now();
	const result = await generateText({
		model: openai(AI_MODELS.curatorReview),
		output: Output.object({ schema: adviceSchema, name: "plan_advice" }),
		...request,
	});
	traceGenerated(
		"plan_advice",
		AI_MODELS.curatorReview,
		started,
		request,
		result,
	);
	await recordAiUsage(meter, AI_MODELS.curatorReview, result.usage);
	return result.output ?? null;
};

const reviewSchema = z.object({
	message: z
		.string()
		.describe(
			"A letter to the team, three or four sentences: what went well, what worries you, and one thing to do next. Last sentence, in the first person: I am back at the next sprint review and follow your devlogs until then. On the final review, it agrees with the verdict, says what the next checkpoint starts from, and that you will see them there.",
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
 * The review of one sprint, from what the team showed in it: every devlog of
 * the sprint, its artifacts and pulse, and the project around them. Nothing
 * was said, so nothing is retold. Null when the model gives nothing usable.
 */
export const writeSprintReview = async (
	input: SprintReviewInput,
	meter?: AiMeter,
	locale?: string,
) => {
	const final = input.verdict !== null;
	const request = {
		instructions: stripIndents`
			${VOICE}

			Review sprint ${input.sprint} from what the team showed: every devlog
			of the sprint, the artifacts it added, who confirmed working, and what
			happened on the project. Judge by what
			anyone can open, not by intentions. A task is done only when an
			artifact closes it. Where a task's evidence was looked at, say what it
			shows; a mismatch is worth naming, but it does not undo the task.
			${final ? "This is the final review: the 28 days are over and the verdict is settled." : ""}
			${locale ? localeLine(locale) : ""}
		`,
		prompt: stripIndents`
			Stage: ${input.stage}
			Goal: ${input.goal}

			Tasks:
			${input.tasks.map(taskLine).join("\n")}

			${input.focusLastReview.length ? `Focus set for this sprint:\n${input.focusLastReview.map((line) => `- ${line}`).join("\n")}` : ""}

			${
				input.devlogs.length
					? `The sprint's devlogs (${input.devlogs.length}):\n${input.devlogs.map((post, index) => `--- devlog ${index + 1}\n${devlogText(post)}`).join("\n")}`
					: "No devlog for the sprint."
			}

			${input.devlogMedia.length ? `What the devlogs' images and videos show:\n${input.devlogMedia.join("\n")}` : ""}

			${artifactLines(input.artifacts) || "No artifacts added in the sprint."}

			Pulse: ${pulseLine(input.pulse)}

			${renderPicture(input.picture)}

			${input.verdict ? `Verdict: ${input.verdict.verdict}. ${input.verdict.note}` : ""}
		`,
	};
	const started = Date.now();
	const result = await generateText({
		model: openai(AI_MODELS.curatorReview),
		output: Output.object({ schema: reviewSchema, name: "sprint_review" }),
		...request,
	});
	traceGenerated(
		"sprint_review",
		AI_MODELS.curatorReview,
		started,
		request,
		result,
	);
	await recordAiUsage(meter, AI_MODELS.curatorReview, result.usage);
	const { output } = result;
	if (!output) return null;
	const { message, ...notes } = output;
	return { message, notes: notes satisfies CallNotes };
};
