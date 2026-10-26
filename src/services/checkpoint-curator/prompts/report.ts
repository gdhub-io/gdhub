import { stripIndents } from "common-tags";
import { CheckpointVerdict } from "@/config/prisma-enums";
import type { TrustReason, UnprovenReason } from "@/lib/checkpoint-verdict";
import { devlogText } from "@/lib/curator-text";
import type { ReportInput } from "../types";
import {
	CURATOR_STANCE,
	localeLine,
	renderCard,
	renderPicture,
	renderWorkflow,
} from "./card";

/**
 * Day 28: the report and the proposed verdict (§8, §9).
 *
 * The verdict that comes back is a proposal. `settleVerdict` decides what is
 * actually written — an outcome that is not delivered (nothing attached, a
 * dead link, evidence of something else) cannot produce `StageClosed` or
 * `GoalMet` whatever this returns. The prompt says so anyway, so the summary
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
				"The report the author reads. What was promised, what changed on day 15 if anything, what is proven and what is not, and what the next checkpoint starts from. Under 300 words.",
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
				"Why this verdict and not the others, in two to four sentences. If anything was taken on trust, say plainly that you accepted it without being able to check it and that you trust the team; if anything was shown only in part, say what was missing.",
		},
	},
	required: ["summary", "verdict", "verdictNote"],
});

export const reportMessages = (input: ReportInput, locale = "en") => [
	{
		role: "system" as const,
		content: stripIndents`
			${CURATOR_STANCE}

			This is the day-28 report. Facts only — everything you write must be
			checkable against what is below.

			The three verdicts:
			- StageClosed: every outcome that was not cut is delivered, AND what has to
			  be done on this stage to move on (listed under "What the project
			  shows") is done. The project can leave this stage. Tasks the
			  stage only suggests never hold it.
			- GoalMet: every outcome that was not cut is delivered, but the stage
			  needs more. The next checkpoint runs on the same stage.
			- GoalMissed: an outcome that was not cut is not delivered.

			You are a cautious optimist. Whether an outcome is delivered is not yours
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
			If the first list is empty, the verdict is StageClosed or GoalMet and
			never GoalMissed.

			A cut outcome is not a failure and is never counted as missing.

			You read links, screenshots and descriptions. You did not run a build or
			play anything, and the report may not imply that you did.

			Where evidence was looked at, say what it shows.

			${localeLine(locale)}
		`,
	},
	{
		role: "user" as const,
		content: stripIndents`
			${renderCard(input.card)}

			${renderWorkflow(input.workflow)}

			${
				input.revision
					? `Day-15 scope change on ${input.revision.revisedAt}: ${input.revision.note ?? "(no reason given)"}`
					: "No day-15 scope change."
			}

			Evidence attached, outcome by outcome:
			${
				input.artifacts
					.map(
						(artifact) =>
							`- [${artifact.itemId}] ${artifact.type}: ${artifact.name ?? artifact.link}${artifact.readable ? "" : " — the platform could not open this"}${artifact.description ? `\n  author's description: ${artifact.description}` : ""}${artifact.seen ? `\n  looked at: ${artifact.seen.match}${artifact.seen.note ? `, ${artifact.seen.note}` : ""}` : ""}`,
					)
					.join("\n") || "- (nothing attached)"
			}

			Not delivered (final, decided by the platform):
			${
				input.unproven
					.map((item) => `- ${item.text} (${UNPROVEN[item.reason]})`)
					.join("\n") || "- (none)"
			}

			Taken on trust (final — say so in the verdict note):
			${
				input.trusted
					.map((item) => `- ${item.text} (${TRUSTED[item.reason]})`)
					.join("\n") || "- (none)"
			}

			Shown in part (final — name what was missing; what was seen is above):
			${input.partly.map((item) => `- ${item.text}`).join("\n") || "- (none)"}

			Devlogs:
			${
				input.devlogs
					.map((post) => `- ${post.publishedAt}: ${devlogText(post.content)}`)
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

			Weekly pulse, member by week:
			${
				input.pulses
					.map(
						(row) =>
							`- ${row.member}: ${row.weeks.map((week) => (week ? "yes" : "—")).join(" ")}`,
					)
					.join("\n") || "- (no pulse recorded)"
			}

			${renderPicture(input.picture)}

			Answer via the ${REPORT_FUNCTION_NAME} function.
		`,
	},
];
