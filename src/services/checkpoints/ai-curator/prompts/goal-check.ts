import { stripIndents } from "common-tags";
import { CHECKPOINT_DAYS } from "@/config/checkpoint";
import { devlogText, fenced } from "@/lib/checkpoints/curator-text";
import type {
	CuratorAuthor,
	CuratorProject,
	GoalCheckInput,
} from "@/types/checkpoint-curator";
import { GOAL_FITS } from "@/types/checkpoints";
import {
	CURATOR_STANCE,
	GOAL_STAGE,
	hintBlock,
	LENSES,
	localeLine,
	renderCard,
	renderCharacter,
	renderMarketing,
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
		`The game: ${fenced(project.name)}${project.genre ? ` (${fenced(project.genre)})` : ""}.`,
		project.pitch
			? `Its pitch: ${fenced(project.pitch)}`
			: "It has no pitch yet.",
	].join(" ");

const renderAuthor = (author: CuratorAuthor | null) =>
	author
		? `The author: ${author.speciality}, ${author.level} level.${author.experience ? ` In their words: ${fenced(author.experience)}` : ""}`
		: "The author's speciality is not known.";

/** GDHUB-156: what the team wrote before the checkpoint, so the read knows what came after what. */
const renderDevlogsBefore = ({
	devlogs,
	devlogsLeftOut,
	devlogMedia,
}: GoalCheckInput) =>
	[
		devlogs?.length
			? `The team's devlogs before this checkpoint, oldest first (${devlogs.length}) — what they worked on, not evidence:\n${devlogs.map((post) => `--- ${post.publishedAt}\n${fenced(devlogText(post.content))}`).join("\n")}`
			: "",
		devlogsLeftOut
			? `${devlogsLeftOut} earlier devlogs not included (too long).`
			: "",
		devlogMedia?.length
			? `What the latest of those devlogs' images and videos show:\n${devlogMedia.map(fenced).join("\n")}`
			: "",
	]
		.filter(Boolean)
		.join("\n\n");

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
					description: `fits: ${CHECKPOINT_DAYS} days of this team's hours can reach it; widen: it asks too little of four weeks; narrow: it outruns them. Fits unless it clearly does not.`,
				},
				note: {
					type: "string",
					description:
						"One or two sentences: why, and for widen or narrow the goal reworded, ready to use.",
				},
				stage: {
					type: "object",
					description: GOAL_STAGE.description,
					properties: {
						inside: { type: "boolean" },
						note: { type: "string", description: GOAL_STAGE.note },
					},
					required: ["inside", "note"],
					additionalProperties: false,
				},
			},
			required: ["fit", "note", "stage"],
			additionalProperties: false,
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
				additionalProperties: false,
			},
		},
		note: {
			type: "string",
			description: `The first letter, spoken by your character: the reader must hear who you are from the first word — greet them the way your character greets, use its turns of phrase. Four or five short sentences: introduce yourself — your name and role, if you have them, and that you will guide them for the next ${CHECKPOINT_DAYS} days and help them reach the goal; then what you looked at — the goal against the hours of the team and the stage — and what you make of it, in one or two sentences: it fits, better make it smaller, or they could do more (the details are shown under the goal: do not repeat them or point at them); you suggested a few tasks below to take or replace with their own; and when the tasks are ready they press "Save and send to the curator" and you will check them. End with a short farewell in character, without your name; nothing about the next sprint.`,
		},
	},
	required: ["goal", "suggestions", "note"],
	// Structured outputs hold the answer to the schema only when it is closed.
	additionalProperties: false,
});

export const goalCheckMessages = (input: GoalCheckInput, locale = "en") => [
	{
		role: "system" as const,
		content: stripIndents`
			${renderCharacter(input.character, "route", true)}

			${CURATOR_STANCE}

			${LENSES}

			This is day 1, right after payment: your first letter to the author.
			They have written only the goal; the tasks come next, from them, and
			your suggestions are where they may start. Judge whether the goal is a
			fair ${CHECKPOINT_DAYS} days for this team, with the hours it has. Where the last
			checkpoint is given, weigh this goal against how that one ended with
			the same team. Read the goal against what the game is and who the
			author is: a goal outside their own craft leans on the rest of the
			team, and where there is no one, say so.

			The hours are what the members themselves stated they have per week,
			summed and carried over the ${CHECKPOINT_DAYS} days. Where the goal outruns them, say so
			and name the hours — never a rate of work you made up. Where nobody has
			stated their hours, the time is unknown, not zero: judge the goal on
			its own.

			Suggest tasks this team can do in four weeks, sized to the goal as it
			should be — the narrowed or widened one where you advise that. Never
			suggest the stage's required tasks: the workflow tracks those, and a
			checkpoint may be one of several on a stage.

			Read the goal against the stage goal too: it sits inside unless it
			clearly reaches past it. A goal outside is the author's choice to
			keep — flag it, never refuse it.

			Be fair rather than strict: the goal fits unless it clearly does not.

			${localeLine(locale)}
		`,
	},
	{
		role: "user" as const,
		content:
			stripIndents`
			${renderProject(input.project)}
			${renderAuthor(input.author)}

			${renderCard(input.card)}
			${[
				input.inputsSeen?.length
					? `What the day-1 artifacts show, as looked at:\n${input.inputsSeen.map((line) => `- ${fenced(line)}`).join("\n")}`
					: "",
				renderDevlogsBefore(input),
			]
				.filter(Boolean)
				.join("\n\n")}

			${renderWorkflow(input.workflow)}

			${renderTeam(input.team, 0)}

			${renderPicture(input.picture)}
			${renderMarketing(input.marketing)}

			${
				input.previous
					? `The project's last checkpoint ended ${input.previous.verdict}${input.previous.note ? `: "${input.previous.note}"` : "."}`
					: "This is the project's first checkpoint."
			}

		` + hintBlock(input.hint),
	},
];
