import { stripIndents } from "common-tags";
import type { CuratorAuthor, CuratorProject, GoalCheckInput } from "../types";
import {
	CURATOR_STANCE,
	localeLine,
	renderCard,
	renderPicture,
	renderTeam,
	renderWorkflow,
} from "./card";

/**
 * Day 1, consultation 1: is this reachable in 28 days (§6).
 *
 * The card is a draft. Someone with no shipped project writes "a finished game"
 * into the outcome list, and 28 days later fails at something that was never 28
 * days of work. This call is what stops that — by naming what does not fit and
 * offering a smaller version of each, never by rewriting the list.
 *
 * "Does not fit" is measured against the team's own stated hours, which is the
 * one number that turns a scope opinion into an argument the author can check.
 */

const renderProject = (project: CuratorProject) =>
	[
		`The game: ${project.name}${project.genre ? ` (${project.genre})` : ""}.`,
		project.pitch ? `Its pitch: "${project.pitch}"` : "It has no pitch yet.",
	].join(" ");

const renderAuthor = (author: CuratorAuthor | null) =>
	author
		? `The author: ${author.speciality}, ${author.level} level.${author.experience ? ` In their words: "${author.experience}"` : ""}`
		: "The author's speciality is not known.";

export const GOAL_CHECK_FUNCTION_NAME = "report_goal_check";

export const goalCheckSchema = (input: GoalCheckInput) => ({
	type: "object",
	properties: {
		reachable: {
			type: "boolean",
			description:
				"true unless this outcome list clearly outruns 28 days for a team with the hours stated below; risks belong in the notes, not here",
		},
		notes: {
			type: "array",
			description:
				"At most one note per task, and only where there is something to say.",
			items: {
				type: "object",
				properties: {
					// An empty enum is not a valid schema: before call 1 there are no
					// tasks yet, only the goal.
					itemId: input.card.outcomes.length
						? {
								type: "string",
								enum: input.card.outcomes.map((item) => item.id),
							}
						: { type: "string" },
					note: {
						type: "string",
						description:
							"One or two sentences about this task. Where it is several tasks' worth of work, say so and offer a smaller wording. Where nothing on the day-1 list builds towards it, say that. Where nothing about it would prove it exists at the end, say that.",
					},
				},
				required: ["itemId", "note"],
			},
		},
		missing: {
			type: "array",
			description:
				"Outcomes the stage requires that this card does not promise. Empty where there are none.",
			items: { type: "string" },
		},
		note: {
			type: "string",
			description:
				"Two to four sentences the author reads. Say what stands out; where the list outruns the hours the team has, say so and name those hours. Where the plan holds up, say so in one line — it looks good, go ahead — and invent nothing to fix. Otherwise end with the one change to make before the goal and tasks lock. Last sentence, in the first person and warm: see you at the start of the next sprint, and until then you look forward to their new devlog posts, artifacts and other activity, ending with a wink ;)",
		},
	},
	required: ["reachable", "notes", "missing", "note"],
});

export const goalCheckMessages = (input: GoalCheckInput, locale = "en") => [
	{
		role: "system" as const,
		content: stripIndents`
			${CURATOR_STANCE}

			This is day 1, right after payment: your first letter to the author.
			For the next hours they can still change the goal and the tasks.
			Judge only whether it fits 28 days of work for this team, with the
			hours it has, and whether the stage's own requirements are covered.
			The card may hold only the goal: tasks are set with the curator on the
			first call. Then judge the goal itself, and leave the notes empty.
			Where the last checkpoint is given, weigh this goal against how that
			one ended with the same team. Read the goal against what the game is
			and who the author is: a goal outside their own craft leans on the
			rest of the team, and where there is no one, say so.

			The hours are what the members themselves stated they have per week,
			summed and carried over the 28 days. Weigh the list against them and
			say plainly where the promise outruns the time, naming the hours it
			has — never a rate of work you made up, and never a task-by-task
			estimate in hours. Where nobody has stated their hours, say the time
			available is unknown and judge the list on its own; unknown hours are
			not zero hours, and must never make everything unreachable.

			The author reads you and then edits their own tasks, so write to be
			read rather than to be parsed. Offer a smaller wording where a task is
			several tasks' worth of work. Where nothing on the day-1 list builds
			towards a task, it starts from scratch — that is normal for a
			checkpoint, so say it as a risk to plan for, not as a reason it cannot
			be done. Say where nothing about a task would prove it exists.

			Be fair rather than strict: the list is reachable unless it clearly
			outruns the hours the team has. A risk, a vague wording or work not
			started yet is a note on that task, not a reason to call the whole
			list unreachable.

			${localeLine(locale)}
		`,
	},
	{
		role: "user" as const,
		content: stripIndents`
			${renderProject(input.project)}
			${renderAuthor(input.author)}

			${renderCard(input.card)}

			${renderWorkflow(input.workflow)}

			${renderTeam(input.team)}

			${renderPicture(input.picture)}

			${
				input.previous
					? `The project's last checkpoint ended ${input.previous.verdict}${input.previous.note ? `: "${input.previous.note}"` : "."}`
					: "This is the project's first checkpoint."
			}

			Answer via the ${GOAL_CHECK_FUNCTION_NAME} function.
		`,
	},
];
