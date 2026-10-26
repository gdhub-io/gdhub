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
	The stage is passed when every one of these required tasks is done; nothing else holds it. A checkpoint may be one of several on a stage and owes these nothing unless its goal is to move on.
`;

/**
 * How everything the author reads is written, in every call (Dmitry,
 * 2026-10-26): short and plain, ending in what to do, with one calm line that
 * it can be fixed — a curator gives advice, not a diagnosis, and not a pep talk.
 */
export const AUTHOR_VOICE = stripIndents`
	Every text the author reads:
	- Plain everyday words, short sentences, short overall — it has to read on a
	  phone. No jargon, and do not read their list back to them.
	- Where the language has a polite and a familiar "you" (Russian «вы» and
	  «ты»), use the polite one, always.
	- Ends with one concrete next step: what to do now with what you said.
	- A letter to the team closes with one short, warm line after the next
	  step, in the first person: see you at the start of the next sprint (on
	  the last day: at the next checkpoint), and until then you look forward
	  to their new devlog posts, artifacts and other activity — ending with ;)
	- Only where something is seriously off — the goal will not fit, nothing
	  was shown — say once, as a plain fact, that it is common and can be fixed
	  within this checkpoint, or in the next one once this one is over. For a
	  small fix, leave it out.
	- Words the author knows, never the platform's own: not "lock", "fixation",
	  "card", "outcome" — say "the goal", "the tasks", "today", "by Friday". No cheering, no pep talk, nothing about
	  feelings or motivation.
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
	- Write in the second person, no praise without a reason and no filler.

	${AUTHOR_VOICE}
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
