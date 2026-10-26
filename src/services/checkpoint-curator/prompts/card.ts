import { stripIndents } from "common-tags";
import type {
	CuratorGoalCard,
	CuratorLine,
	CuratorTeam,
	CuratorWorkflow,
} from "../types";

/**
 * The goal card as the model sees it, and the line every prompt opens with.
 *
 * One renderer for all four calls: the day-28 report is judged against the same
 * card the day-1 check read, and two renderings would eventually disagree about
 * what a cut or a rewording looks like.
 */

const line = (item: CuratorLine) => {
	const marks = [
		item.cut ? "CUT on day 15, no longer owed" : null,
		item.addedAt ? "added on day 15" : null,
		item.originalText
			? `reworded, day 1 wording: "${item.originalText}"`
			: null,
	].filter(Boolean);

	return `- [${item.id}] ${item.text}${marks.length ? ` (${marks.join("; ")})` : ""}`;
};

export const renderCard = (card: CuratorGoalCard) => stripIndents`
	Goal: ${card.goal || "(not written)"}

	What the project had on day 1:
	${card.inputs.map(line).join("\n") || "- (nothing listed)"}

	What it owes by day 28:
	${card.outcomes.map(line).join("\n") || "- (nothing listed)"}
`;

/**
 * The team's stated time. Silence is rendered as silence: a team that stated
 * nothing must read as unknown hours, not as a team with none.
 */
export const renderTeam = (team: CuratorTeam) => {
	const people = `${team.members} ${team.members === 1 ? "person" : "people"}`;

	if (!team.hoursPerWeek || !team.hoursPerRun) {
		return `The team: ${people}. Nobody stated their hours, so the time available is unknown — which is not the same as none.`;
	}

	const silent = team.members - team.stated;

	return [
		`The team: ${people}, ${team.stated} of whom stated their hours.`,
		`Stated time: ${team.hoursPerWeek.from}–${team.hoursPerWeek.to} hours a week between them, so ${team.hoursPerRun.from}–${team.hoursPerRun.to} hours over the 28 days.`,
		silent
			? `The other ${silent} stated nothing and are not in that total.`
			: "",
	]
		.filter(Boolean)
		.join(" ");
};

export const renderWorkflow = (workflow: CuratorWorkflow) => stripIndents`
	Workflow stage: ${workflow.currentStage}
	${workflow.description ? `What the stage is for: ${workflow.description}` : ""}
	What the stage template requires:
	${workflow.requiredTasks.map((task) => `- ${task}`).join("\n") || "- (nothing recorded)"}
`;

/**
 * The line every prompt carries. The AI curator reports what it can open; a
 * human curator judges. Every prompt repeats it because a model asked for an
 * opinion will give one, and the product sells that difference.
 */
export const CURATOR_STANCE = stripIndents`
	You are the AI curator of a 28-day Checkpoint on GDHub, a platform for indie
	game developers. An author states what their project has today and what will
	exist in 28 days, and a verdict is written at the end.

	Hold this line in everything you write:
	- You report what you can see and check against the goal card. You do not
	  judge whether the work is any good — that is what a human curator is paid
	  for, and claiming it would sell you as something you are not.
	- You never decide the author's scope for them. You may say what does not fit
	  and offer a smaller version; taking it is theirs.
	- You never imply you ran a build, played the game, or saw anything beyond the
	  links and text you were given.
	- You hold no calls. A human curator says these things on a 45-minute call and
	  writes them up; you write them and send them, and nothing you write may
	  refer to a meeting, a call, or having spoken to anyone.
	- Write plainly, in the second person, no praise and no filler. Short.
`;

export const localeLine = (locale = "en") =>
	`Answer in the language with code "${locale}".`;

/**
 * The project around the card (GDHUB-111). It explains what happened; it never
 * proves an outcome — only an artifact that opens does that.
 */
export const renderPicture = (picture: string) => stripIndents`
	What the project shows — context for your judgement. It never proves an
	outcome; only an artifact that opens does.
	${picture}
`;
