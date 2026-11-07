import { stripIndents } from "common-tags";
import { CHECKPOINT_DAYS } from "@/config/checkpoint";
import { CheckpointVerdict } from "@/config/prisma-enums";
import { devlogText, fenced } from "@/lib/checkpoints/curator-text";
import type { TrustReason, UnprovenReason } from "@/lib/checkpoints/verdict";
import type { ReportInput } from "@/types/checkpoint-curator";
import {
	CURATOR_STANCE,
	hintBlock,
	LENSES,
	localeLine,
	renderCard,
	renderCharacter,
	renderDirection,
	renderJournal,
	renderMarketing,
	renderPicture,
	renderTeam,
	renderWorkflow,
} from "./card";

/**
 * Day 28: the report and the proposed verdict (§8, §9).
 *
 * The verdict that comes back is a proposal. `settleVerdict` decides what is
 * actually written — an outcome that is not delivered (nothing attached, a
 * dead link, evidence of something else) cannot produce `StageClosed` or
 * `GoalMet` whatever this returns; every outcome delivered still leaves the
 * goal to this judgement (GDHUB-122). The prompt says so anyway, so the summary
 * and the verdict do not contradict each other on the page, and it hands over
 * what was taken on trust so the note can say so (GDHUB-81).
 */

export const REPORT_FUNCTION_NAME = "report_checkpoint";

const UNPROVEN: Record<UnprovenReason, string> = {
	missing: "nothing attached",
	broken: "the link leads nowhere",
	doesNotMatch: "the evidence shows something else",
};

const TRUSTED: Record<TrustReason, string> = {
	needsLogin: "behind a login",
	unreadable: "could not see what it holds",
	notChecked: "could not be checked in time",
};

export const reportSchema = () => ({
	type: "object",
	properties: {
		summary: {
			type: "string",
			description:
				"The report, plain and to the point. What was promised, what changed on day 15 if anything, what is proven and what is not, and what the next checkpoint starts from. Under 150 words.",
		},
		verdict: {
			type: "string",
			enum: [
				CheckpointVerdict.StageClosed,
				CheckpointVerdict.GoalMet,
				CheckpointVerdict.GoalMissed,
			],
		},
		verdictNote: {
			type: "string",
			description:
				"Why this verdict and not the others, in two to four sentences: the stage's expectation, the goal, and whether the evidence shows it. If anything was taken on trust, say plainly that you accepted it without being able to check it and that you trust the team; if anything was shown only in part, say what was missing. If the goal is missed after advice the team did not take, name that advice in one sentence and say it can be made up on the way to the next checkpoint. Where it explains the verdict, say it through the lenses: what was built, what the audience saw, the team's hours, the tasks' way to the goal — they explain, never decide. Say in one sentence how the direction went across the sprints, when the directions are given, calling each sprint by the direction it was given — toward, sideways, standing still, nothing done — never merging two into one. The direction explains the verdict; the tasks and the goal decide it. End with what to do next, in the next checkpoint. This is your verdict entry, in your voice; nothing about the road the final review already told.",
		},
	},
	required: ["summary", "verdict", "verdictNote"],
	additionalProperties: false,
});

export const reportMessages = (input: ReportInput, locale = "en") => [
	{
		role: "system" as const,
		content: stripIndents`
			${renderCharacter(input.character, "verdict")}

			${CURATOR_STANCE}

			${LENSES}

			This is the day-${CHECKPOINT_DAYS} report. Facts only — everything you write must be
			checkable against what is below.

			Judge from the outside in. The stage has its own expectation — what
			"What the project shows" says must be done here (on Ideation, an idea
			found; on a demo stage, the demo). Inside it sits the checkpoint's goal,
			and inside the goal the plan: the outcomes meant to reach it. Delivered
			outcomes are the plan done, not the goal reached. Ask whether the
			evidence shows the goal itself, as worded, within what this stage
			expects.

			The three verdicts:
			- StageClosed: the goal is shown, every outcome that was not cut is
			  delivered, AND what has to be done on this stage to move on is done.
			  The project can leave this stage.
			- GoalMet: the goal is shown and every outcome that was not cut is
			  delivered, but the stage needs more. The next checkpoint runs on the
			  same stage — a normal outcome, since a stage often takes several
			  checkpoints; never frame it as falling short.
			- GoalMissed: an outcome that was not cut is not delivered, or every
			  outcome is delivered but together they do not show the goal.

			Your journal below holds what you advised along the road. Where you
			advised a change, the team went another way and the goal is not shown,
			the goal is missed: say once, plainly and without blame, what you had
			advised — and that it is nothing terrible: the next checkpoint starts
			from here and can make it up. Where the team took its own route and the
			goal is shown anyway, it is met; credit the route.

			Whether an outcome is delivered is not yours
			to judge — the platform has already decided it from the evidence, and the
			three lists below are final:
			- Not delivered: nothing attached, a link that leads nowhere, or
			  evidence that shows something other than the task. If this list is not
			  empty the verdict is GoalMissed, and the platform will overrule you if
			  you say otherwise.
			- Taken on trust: the link was given but you could not see what it holds
			  (behind a login, a format you cannot read, a video you saw only the
			  title of). It counts as delivered. The verdict note must say you
			  accepted it without checking and that you trust the team.
			- Shown in part: the evidence shows part of the task. It counts as
			  delivered; the verdict note names what was missing.
			An empty first list means the plan is done; whether the goal is met is
			still yours to judge from the evidence.

			A cut outcome is not a failure and is never counted as missing.

			You read links, screenshots and descriptions. You did not run a build or
			play anything, and the report may not imply that you did.

			Where evidence was looked at, say what it shows.

			The project may move to the next stage only when all hold: the goal is
			shown, every outcome of this checkpoint is delivered, and every required
			task of the stage is done. With the goal missed, never say the project can move on,
			even where the stage's own tasks are done — say what still stands
			between it and the next stage.

			In the summary and the note, name the verdict the way the author sees it
			— the goal was met, the goal was missed, or the project is ready for the
			next stage — never by its code (GoalMet, GoalMissed, StageClosed).

			${localeLine(locale)}
		`,
	},
	{
		role: "user" as const,
		content:
			stripIndents`
			${renderJournal(input.journal)}

			${renderCard(input.card)}

			${renderWorkflow(input.workflow)}

			${
				input.revision
					? `Day-15 scope change on ${input.revision.revisedAt}: ${input.revision.note ? fenced(input.revision.note) : "(no reason given)"}`
					: "No day-15 scope change."
			}

			Evidence attached, outcome by outcome:
			${
				input.artifacts
					.map(
						(artifact) =>
							`- [${artifact.itemId}] ${artifact.type}: ${fenced(artifact.name ?? artifact.link)}${artifact.readable ? "" : " — the platform could not open this"}${artifact.description ? `\n  author's description: ${fenced(artifact.description)}` : ""}${artifact.seen ? `\n  looked at: ${artifact.seen.match}${artifact.seen.note ? `, ${fenced(artifact.seen.note)}` : ""}` : ""}`,
					)
					.join("\n") || "- (nothing attached)"
			}

			Not delivered (final, decided by the platform):
			${
				input.unproven
					.map((item) => `- ${fenced(item.text)} (${UNPROVEN[item.reason]})`)
					.join("\n") || "- (none)"
			}

			Taken on trust (final — say so in the verdict note):
			${
				input.trusted
					.map((item) => `- ${fenced(item.text)} (${TRUSTED[item.reason]})`)
					.join("\n") || "- (none)"
			}

			Shown in part (final — name what was missing; what was seen is above):
			${input.partly.map((item) => `- ${fenced(item.text)}`).join("\n") || "- (none)"}

			Devlogs:
			${
				input.devlogs
					.map(
						(post) =>
							`- ${post.publishedAt}: ${fenced(devlogText(post.content))}`,
					)
					.join("\n") || "- (none)"
			}

			${
				input.calls.length
					? `The curator's calls, from their notes:\n${input.calls
							.map(
								(call) =>
									`- call ${call.index}: ${call.inShort}${call.agreed.length ? `\n  agreed: ${call.agreed.join("; ")}` : ""}`,
							)
							.join("\n")}`
					: ""
			}

			${renderTeam(input.team)}

			${renderPicture(input.picture)}
			${renderMarketing(input.marketing)}

			${input.difference ?? ""}

			${
				input.directions?.length
					? `The direction each sprint review named (toward / sideways / stalled / idle):\n${input.directions
							.map(
								({ sprint, direction }) =>
									`- sprint ${sprint}: ${renderDirection(direction)}`,
							)
							.join("\n")}`
					: ""
			}

		` + hintBlock(input.hint),
	},
];
