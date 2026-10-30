import type { CheckpointVerdict } from "@gdhub-io/gdhub-prisma";
import { generateText, Output } from "ai";
import { stripIndents } from "common-tags";
import { z } from "zod";
import { AI_MODELS } from "@/config/ai-models";
import { CHECKPOINT_DAYS } from "@/config/checkpoint";
import { devlogText } from "@/lib/checkpoints/curator-text";
import { aiModel } from "@/services/ai/model";
import { traceGenerated } from "@/services/ai-trace";
import { type AiMeter, recordAiUsage } from "@/services/ai-usage";
import {
	AUTHOR_VOICE,
	GOAL_STAGE,
	HIRING,
	LENSES,
	legOfSprint,
	localeLine,
	type RoadLeg,
	renderCharacter,
	renderJournal,
	renderMarketing,
	renderPicture,
	renderPulse,
	renderTeam,
	renderWorkflow,
} from "@/services/checkpoints/ai-curator/prompts/card";
import {
	artifactLines,
	type CuratorTask,
	taskLine,
} from "@/services/checkpoints/call-notes";
import type {
	CuratorMarketing,
	CuratorTeam,
	CuratorWorkflow,
	JournalEntry,
} from "@/types/checkpoint-curator";
import {
	type CallNotes,
	GOAL_FITS,
	type PlanAdvice,
	TASK_ADVICE_KINDS,
} from "@/types/checkpoints";

export type { CuratorTask };

export type PlanAdviceInput = {
	goal: string;
	/** The character the AI curator plays on this checkpoint, if any. */
	character?: string | null;
	/** The curator's letters the team has read so far on this checkpoint. */
	journal?: JournalEntry[];
	workflow: CuratorWorkflow;
	/** Who is on the team, their hours and the weeks behind. */
	team: CuratorTeam;
	tasks: CuratorTask[];
	/** Day 1 sets the tasks; day 15 changes them for the last time. */
	moment: "start" | "midway";
	/** Midway: what the first two sprints showed. */
	review: string | null;
	/** The project as its page shows it: the stage's path, the team, recent activity. */
	picture: string;
	marketing: CuratorMarketing;
};

export type SprintReviewInput = {
	goal: string;
	character?: string | null;
	journal?: JournalEntry[];
	workflow: CuratorWorkflow;
	/** The sprint looked back at, 1–4. */
	sprint: number;
	tasks: CuratorTask[];
	/** Every devlog posted in the sprint, oldest first. */
	devlogs: string[];
	/** What the images and videos in those devlogs show, one line each. */
	devlogMedia: string[];
	/** What the sprint's artifacts that prove no task show: its build video, a document. */
	artifactsSeen?: string[];
	artifacts: { type: string; name: string | null }[];
	/** The team, with each member's weeks: the sprint's pulse is its last one. */
	team: CuratorTeam;
	focusLastReview: string[];
	/** Day 29: the verdict already settled, for the letter to agree with it. */
	verdict: { verdict: CheckpointVerdict; note: string } | null;
	picture: string;
	marketing: CuratorMarketing;
};

const voice = (
	character: string | null | undefined,
	leg: RoadLeg,
) => stripIndents`
	${renderCharacter(character, leg)}

	You are the AI curator of a game team on GDHub, through a ${CHECKPOINT_DAYS}-day checkpoint:
	a goal, four one-week sprints, a review after each and a verdict at the end.
	You stand in for a human curator's calls, so you talk to the team directly
	and clearly, as someone who read everything they made. No filler, no
	praise without a reason.
	Use only task ids given to you, and only in the id fields: in text the
	author reads, name a task by its own words, never by its id.

	${AUTHOR_VOICE}
`;

/** One structured call on the curator's model: traced, metered, null when unusable. */
const runStructured = async <S extends z.ZodType>(
	name: string,
	schema: S,
	request: { instructions: string; prompt: string },
	meter?: AiMeter,
) => {
	const started = Date.now();
	const result = await generateText({
		model: aiModel(AI_MODELS.curatorReview),
		output: Output.object({ schema, name }),
		...request,
	});
	traceGenerated(name, AI_MODELS.curatorReview, started, request, result);
	await recordAiUsage(meter, AI_MODELS.curatorReview, result.usage);
	return (result.output as z.infer<S> | undefined) ?? null;
};

/** A task by its own words in text the author reads; its id stays in id fields. */
const taskName = (tasks: CuratorTask[], id: string) =>
	tasks.find((task) => task.id === id)?.text ?? id;

// Nullable rather than optional: strict structured outputs require every key.
const adviceSchema = z.object({
	message: z
		.string()
		.nullable()
		.describe(
			"Day 1: a short letter to the team, three or four sentences, about the tasks as a whole and what to do now. Null halfway: that day's sprint review is the letter.",
		),
	tasks: z.array(
		z.object({
			itemId: z.string(),
			kind: z
				.enum(TASK_ADVICE_KINDS)
				.describe(
					"clear: checkable and fits; risky: may not fit the time left; vague: nobody could check it is done; shorten: keep it smaller; cut: drop it; onTrack: going as planned; offGoal: done or not, it would not bring the goal closer — the note says what the task would have to become to serve it.",
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
	goal: z
		.object({
			fit: z.enum(GOAL_FITS),
			note: z
				.string()
				.describe(
					"One or two sentences: why, and for widen or narrow the goal reworded, ready to use.",
				),
			stage: z
				.object({
					inside: z.boolean(),
					note: z.string().describe(GOAL_STAGE.note),
				})
				.describe(GOAL_STAGE.description),
		})
		.nullable()
		.describe(
			`Day 1 only, null halfway: does the goal as it stands now fit these tasks and ${CHECKPOINT_DAYS} days of this team's hours — fits, widen (asks too little), narrow (outruns them).`,
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
			${voice(input.character, input.moment === "start" ? "route" : "rethink")}

			Read the team's tasks against the goal and the time left. A good task
			ends in something anyone can open — a build, a document, a video —
			fits the weeks it has, and brings the goal closer: a task that would
			not, done or not, is offGoal, with what it would have to become to
			serve the goal. Give one entry per open task (not done, not cut).
			Through the lenses: where the team's stated hours cannot carry the
			plan, say so (team); where the stage weighs marketing high and no task
			reaches the audience, propose one in add (marketing).
			${
				input.moment === "start"
					? "This is day 1: four weeks lie ahead. The author wrote these tasks after your first letter and sent them to you; this is your one check of them, and next they approve the plan. Do not greet again. Say whether the goal and the tasks hold together, and what to change before approving."
					: "This is halfway, after the sprint 2 review: two weeks are left and this is the last change to the tasks. Prefer shortening and cutting to adding."
			}
			${HIRING}
			${LENSES}
			${locale ? localeLine(locale) : ""}
		`,
		prompt: stripIndents`
			${renderJournal(input.journal)}

			${renderWorkflow(input.workflow)}

			${renderTeam(input.team)}
			Goal: ${input.goal}

			Tasks:
			${input.tasks.length ? input.tasks.map(taskLine).join("\n") : "(none yet)"}

			${input.review ? `What the sprints so far showed:\n${input.review}` : ""}

			${renderPicture(input.picture)}
			${renderMarketing(input.marketing)}
		`,
	};
	return runStructured("plan_advice", adviceSchema, request, meter);
};

const assessmentSchema = z.object({
	inShort: z
		.string()
		.describe(
			"Two or three sentences. First where the team stands, in plain words: on course, at risk or behind. Then what landed, what did not, the main risk. When nothing was shown, say that it is unknown what got done, because nothing was shown.",
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
	questions: z
		.array(z.string())
		.describe("Questions the team should answer for itself."),
	lenses: z
		.object({
			marketing: z
				.string()
				.describe(
					"Marketing: what the public devlogs told the audience and how it answered, by name with applause and views; one line when the stage weighs it low.",
				),
			team: z
				.string()
				.describe(
					"Team: the hours and the pace against the goal; context, not blame. One or two sentences.",
				),
			management: z
				.string()
				.describe(
					"Project management: how the tasks close against the 28 days, and the way from them to the goal, the stage goal and the project goal. One or two sentences.",
				),
		})
		.describe(
			"Three of the four lenses; development is discussed and outsidePlan. Each sized by the stage's weight for it.",
		),
});

type SprintAssessment = z.infer<typeof assessmentSchema>;

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
			You are the AI curator of a game team on GDHub, through a ${CHECKPOINT_DAYS}-day
			checkpoint: a goal, four one-week sprints, a review after each and a
			verdict at the end. Review sprint ${input.sprint} from what the team
			showed: every devlog of the sprint, the artifacts it added, who
			confirmed working, and what happened on the project. Judge by what
			anyone can open, not by intentions. A task is done only when an
			artifact closes it. Where a task's evidence was looked at, say what it
			shows; a mismatch is worth naming, but it does not undo the task.
			Use only task ids given to you, and only in the id fields: in text,
			name a task by its own words. Reassurance and the next step are not
			part of the review.
			The focus set for this sprint was advice, not the measure: work the
			team chose instead that still moves the goal or a task counts — say
			what it moved. Name a gap only where nothing moves the goal.
			${HIRING}
			${LENSES}
			${final ? `This is the final review: the ${CHECKPOINT_DAYS} days are over and the verdict is settled.` : ""}

			${AUTHOR_VOICE}
			${locale ? localeLine(locale) : ""}
		`,
		prompt: stripIndents`
			${renderWorkflow(input.workflow)}
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

			${input.artifactsSeen?.length ? `What the sprint's artifacts beside its tasks show — its build video among them:\n${input.artifactsSeen.join("\n")}` : ""}

			${renderTeam(input.team)}
			${renderPulse(input.team, input.sprint)}

			${renderPicture(input.picture)}
			${renderMarketing(input.marketing)}

			${input.verdict ? `Verdict: ${input.verdict.verdict}. ${input.verdict.note}` : ""}
		`,
	};
	return runStructured("sprint_review", assessmentSchema, request, meter);
};

/** The review as the next calls read it: the advice halfway, then the letter. */
const renderAssessment = (review: SprintAssessment, tasks: CuratorTask[]) => {
	const named = (id: string) => taskName(tasks, id);
	return [
		`How the sprint stands: ${review.inShort}`,
		...review.discussed.map((row) => `- ${named(row.itemId)}: ${row.text}`),
		review.notDiscussed.length &&
			`Nothing shown yet for: ${review.notDiscussed.map(named).join("; ")}`,
		review.outsidePlan.length &&
			`Work outside the plan: ${review.outsidePlan.join("; ")}`,
		review.questions.length &&
			`Questions for the team: ${review.questions.join(" ")}`,
		`Marketing: ${review.lenses.marketing}`,
		`Team: ${review.lenses.team}`,
		`Project management: ${review.lenses.management}`,
	]
		.filter(Boolean)
		.join("\n");
};

/** What is new in the sprint, as the letter names it before judging it. */
const shown = (input: SprintReviewInput) =>
	[
		...input.devlogs.map(
			(post) =>
				`- Devlog: ${
					post
						.split("\n")
						.find((line) => line.trim())
						?.slice(0, 160) ?? ""
				}`,
		),
		...input.artifacts.map(
			(artifact) =>
				`- Artifact: ${artifact.type}${artifact.name ? ` "${artifact.name}"` : ""}`,
		),
	].join("\n") || "Nothing: no devlog and no artifact.";

/** The halfway advice the letter must agree with. */
type MidwayAdvice = Pick<PlanAdvice, "tasks" | "add">;

/** Halfway, the advice reads the same sprint the review did, and the review itself. */
export const midwayAdviceInput = (
	input: Omit<SprintReviewInput, "devlogMedia">,
	review: string,
): PlanAdviceInput => ({
	goal: input.goal,
	character: input.character,
	journal: input.journal,
	workflow: input.workflow,
	team: input.team,
	tasks: input.tasks,
	moment: "midway",
	review,
	picture: input.picture,
	marketing: input.marketing,
});

const letterSchema = z.object({
	message: z
		.string()
		.describe(
			"A letter to the team, three or four sentences, built from the review: where the team stands in plain words — on course, at risk or behind; what went well, or, when nothing was shown, that it is unknown what got done because nothing was shown; what worries you; and one thing to do next. On the final review, the whole road instead — four to six sentences that agree with the verdict and say what the next checkpoint starts from.",
		),
	agreed: z
		.array(
			z.object({
				text: z.string(),
				itemId: z.string().nullable(),
				dueDay: z.number().int().nullable(),
			}),
		)
		.describe(
			"The focus for the next sprint, two or three lines that agree with the review and with any advice on the tasks; dueDay stays null. Empty on the final review.",
		),
});

/**
 * The letter and the next sprint's focus, from the review already written and,
 * halfway, the advice on the tasks — so the three never disagree.
 */
const writeReviewLetter = async (
	input: SprintReviewInput,
	review: string,
	advice: MidwayAdvice | null,
	meter?: AiMeter,
	locale?: string,
) => {
	const final = input.verdict !== null;
	const named = (id: string) => taskName(input.tasks, id);
	const request = {
		instructions: stripIndents`
			${voice(input.character, legOfSprint(input.sprint, final))}

			Your review of sprint ${input.sprint} is written below. Turn it into
			the letter the team reads and the focus for the next sprint. Add no
			judgement the review does not hold.
			Open with what you looked at that is new since your last letter —
			the devlogs and artifacts below, by their own words, or that nothing
			new was shown — and only then what it tells you and what to do next.
			The reader must know what a judgement is about before reading it.
			Your last focus was advice, not the measure: where the team went
			another way and it still moves the goal or a task, say what it moved
			and count it, without asking why they did not follow you.
			${advice ? "Your advice on the tasks is below too; the team reads it under the tasks. The letter and the focus follow it." : ""}
			${final ? `This is the final review: the ${CHECKPOINT_DAYS} days are over and the verdict is settled.` : ""}
			${locale ? localeLine(locale) : ""}
		`,
		prompt: stripIndents`
			${renderJournal(input.journal)}

			Goal: ${input.goal}

			Tasks, by id for the focus:
			${input.tasks.map((task) => `- [${task.id}] ${task.text}`).join("\n")}

			What the team showed in the sprint:
			${shown(input)}

			Your review of the sprint:
			${review}

			${
				advice
					? `Your advice on the tasks:\n${[
							...advice.tasks.map(
								(row) =>
									`- ${named(row.itemId)} (${row.kind}): ${row.note}${row.suggestion ? ` Reworded: ${row.suggestion}` : ""}`,
							),
							...advice.add.map((line) => `- Add: ${line}`),
						].join("\n")}`
					: ""
			}

			${input.verdict ? `Verdict: ${input.verdict.verdict}. ${input.verdict.note}` : ""}
		`,
	};
	return runStructured("review_letter", letterSchema, request, meter);
};

/**
 * A sprint review end to end: the review, halfway the advice that reads it,
 * then the letter and the focus from both. Null when a step gives nothing usable.
 */
export const reviewSprint = async <Advice extends MidwayAdvice>(
	input: SprintReviewInput,
	advise: ((review: string) => Promise<Advice | null>) | null,
	meter?: AiMeter,
	locale?: string,
) => {
	const assessment = await writeSprintReview(input, meter, locale);
	if (!assessment) return null;
	const review = renderAssessment(assessment, input.tasks);
	const advice = advise ? await advise(review).catch(() => null) : null;
	const letter = await writeReviewLetter(input, review, advice, meter, locale);
	if (!letter) return null;
	// A task the advice cuts is never the next sprint's focus.
	const cut = new Set(
		advice?.tasks.filter((row) => row.kind === "cut").map((row) => row.itemId),
	);
	return {
		message: letter.message,
		notes: {
			...assessment,
			agreed: letter.agreed.filter((line) => !cut.has(line.itemId ?? "")),
		} satisfies CallNotes,
		advice,
	};
};
