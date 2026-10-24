import { stripIndents } from "common-tags";
import { CheckpointVerdict } from "@/config/prisma-enums";
import { devlogText } from "@/lib/curator-text";
import type { ReportInput } from "../types";
import {
	CURATOR_STANCE,
	localeLine,
	renderCard,
	renderPicture,
	renderStage,
} from "./card";

/**
 * Day 28: the report and the proposed verdict (§8, §9).
 *
 * The verdict that comes back is a proposal. `settleVerdict` decides what is
 * actually written — an outcome that was not cut and carries no readable
 * artifact cannot produce `StageClosed` or `GoalMet` whatever this returns, and
 * the model has no way to waive it. The prompt says so anyway, so the summary
 * and the verdict do not contradict each other on the page.
 */

export const REPORT_FUNCTION_NAME = "report_checkpoint";

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
			description: "One or two sentences: why this verdict and not the others.",
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
			- StageClosed: every outcome that was not cut is proven, AND what has to
			  be done on this stage to move on (listed under "What the project
			  shows") is done. The project can leave this stage.
			- GoalMet: every outcome that was not cut is proven, but the stage needs
			  more. The next checkpoint runs on the same stage.
			- GoalMissed: an outcome that was not cut has no readable evidence.

			"Proven" is not yours to judge: the unproven list below is computed from
			the artifacts and is final. If it is not empty the verdict is GoalMissed,
			and the platform will overrule you if you say otherwise. If it is empty,
			the verdict is StageClosed or GoalMet and never GoalMissed.

			A cut outcome is not a failure and is never counted as missing.

			You read links, screenshots and descriptions. You did not run a build or
			play anything, and the report may not imply that you did.

			Where evidence was looked at, say what it shows. Name an outcome whose
			evidence does not match, but it still counts as proven: what decides
			the verdict is the unproven list, not what you saw.

			${localeLine(locale)}
		`,
	},
	{
		role: "user" as const,
		content: stripIndents`
			${renderCard(input.card)}

			${renderStage(input.stage)}

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

			Outcomes with no readable evidence (final, computed by the platform):
			${
				input.unproven
					.map((item) => `- ${item.text} (${item.reason})`)
					.join("\n") || "- (none)"
			}

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
