import { stripIndents } from "common-tags";
import { GOAL_FITS } from "@/types/checkpoints";
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
 * Day 1, right after payment (GDHUB-117): the goal alone is read — is it a
 * fair 28 days for this team, against the hours they stated — and the first
 * letter asks for the tasks, with a few suggested to start from. The tasks the
 * author then writes are checked by the plan advice, once.
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

export const goalCheckSchema = () => ({
	type: "object",
	properties: {
		goal: {
			type: "object",
			description: "Your word on the goal, shown right under it.",
			properties: {
				fit: {
					type: "string",
					enum: [...GOAL_FITS],
					description:
						"fits: 28 days of this team's hours can reach it; widen: it asks too little of four weeks; narrow: it outruns them. Fits unless it clearly does not.",
				},
				note: {
					type: "string",
					description:
						"One or two sentences: why, and for widen or narrow the goal reworded, ready to use.",
				},
			},
			required: ["fit", "note"],
		},
		suggestions: {
			type: "array",
			description:
				"Three to five tasks that together would show the goal is reached, in the order to do them. Each ends in something anyone can open — a build, a document, a video.",
			items: {
				type: "object",
				properties: {
					text: {
						type: "string",
						description: "The task, ready to add as it is.",
					},
					why: {
						type: "string",
						description:
							"One short sentence: what this task proves about the goal.",
					},
				},
				required: ["text", "why"],
			},
		},
		note: {
			type: "string",
			description:
				"The first letter, two or three sentences. Greet them: you are their AI curator for the next 28 days. Ask them to write one to five tasks that will show the goal is reached — their own or from your suggestions below — and send them to you for a check. Do not repeat the goal advice or the suggestions; they are shown next to the letter.",
		},
	},
	required: ["goal", "suggestions", "note"],
});

export const goalCheckMessages = (input: GoalCheckInput, locale = "en") => [
	{
		role: "system" as const,
		content: stripIndents`
			${CURATOR_STANCE}

			This is day 1, right after payment: your first letter to the author.
			They have written only the goal; the tasks come next, from them, and
			your suggestions are where they may start. Judge whether the goal is a
			fair 28 days for this team, with the hours it has. Where the last
			checkpoint is given, weigh this goal against how that one ended with
			the same team. Read the goal against what the game is and who the
			author is: a goal outside their own craft leans on the rest of the
			team, and where there is no one, say so.

			The hours are what the members themselves stated they have per week,
			summed and carried over the 28 days. Where the goal outruns them, say so
			and name the hours — never a rate of work you made up. Where nobody has
			stated their hours, the time is unknown, not zero: judge the goal on
			its own.

			Suggest tasks this team can do in four weeks, sized to the goal as it
			should be — the narrowed or widened one where you advise that. Never
			suggest the stage's required tasks: the workflow tracks those, and a
			checkpoint may be one of several on a stage.

			Be fair rather than strict: the goal fits unless it clearly does not.

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
