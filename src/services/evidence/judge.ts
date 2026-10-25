import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { stripIndents } from "common-tags";
import { z } from "zod";
import { AI_MODELS } from "@/config/ai-models";
import { EvidenceMatch } from "@/config/prisma-enums";
import { devlogText } from "@/lib/curator-text";
import { traceGenerated } from "@/services/ai-trace";
import { type AiMeter, recordAiUsage } from "@/services/ai-usage";
import type { EvidenceContent } from "./read";

const HONEST = stripIndents`
	You look at evidence a game team attached on GDHub: text, images, or frames
	sampled from a video. Say only what is actually there. You did not run or
	play anything: say what is shown — a level, a mechanic, a menu, a character —
	never how the game feels to play. Plain English, short.
`;

/** The content as model input: what could not be read, the text, then the images. */
const contentParts = (content: EvidenceContent) => [
	{
		type: "text" as const,
		text: [
			content.unread && `Not read: ${content.unread}.`,
			content.text ?? (content.images.length ? null : "(no text)"),
		]
			.filter(Boolean)
			.join("\n"),
	},
	...content.images.map((image) => ({
		type: "file" as const,
		data: image.data,
		mediaType: image.mediaType,
	})),
];

const judgeSchema = z.object({
	match: z
		.enum([
			EvidenceMatch.Matches,
			EvidenceMatch.Partly,
			EvidenceMatch.DoesNotMatch,
			EvidenceMatch.CannotTell,
		])
		.describe(
			"Matches: it shows what the task promised. Partly: some of it. DoesNotMatch: it shows something else. CannotTell: too little was readable to say.",
		),
	note: z
		.string()
		.describe(
			"One or two sentences: what you saw, and how it relates to the task.",
		),
});

export type EvidenceTask = {
	task: string;
	artifactType: string;
	artifactName: string | null;
	/** The author's own words about the artifact. */
	description: string | null;
	/** The checkpoint's devlogs so far, oldest first: context, never proof. */
	devlogs: string[];
};

/** Does this evidence show what the task promised? Null when the model gives nothing. */
export async function judgeEvidence(
	evidence: EvidenceTask,
	content: EvidenceContent,
	meter?: AiMeter,
) {
	const request = {
		instructions: stripIndents`
			${HONEST}
			Judge whether the evidence shows what the task promised. When nothing
			usable could be read, the answer is CannotTell — never a guess.
			The team's devlogs may help you understand what the evidence is, but
			they are not evidence: judge only what the evidence itself shows. A
			devlog saying the work is done never makes evidence of something else
			match.
		`,
		messages: [
			{
				role: "user" as const,
				content: [
					{
						type: "text" as const,
						text: stripIndents`
							Task: ${evidence.task}
							Evidence: ${evidence.artifactType}${evidence.artifactName ? ` "${evidence.artifactName}"` : ""}
							${evidence.description ? `The author says: ${evidence.description}` : ""}
							What the evidence contains:
						`,
					},
					...contentParts(content),
					// After the evidence: placed before it, the model took the devlogs
					// for the whole message and judged the evidence unread (GDHUB-117).
					...(evidence.devlogs.length
						? [
								{
									type: "text" as const,
									text: `Context only, not evidence — the team's devlogs (${evidence.devlogs.length}):\n${evidence.devlogs.map((post, index) => `--- devlog ${index + 1}\n${devlogText(post)}`).join("\n")}`,
								},
							]
						: []),
				],
			},
		],
	};
	const started = Date.now();
	const result = await generateText({
		model: openai(AI_MODELS.curatorReview),
		output: Output.object({ schema: judgeSchema, name: "evidence_match" }),
		...request,
	});
	traceGenerated(
		"evidence_match",
		AI_MODELS.curatorReview,
		started,
		request,
		result,
	);
	await recordAiUsage(meter, AI_MODELS.curatorReview, result.usage);
	return result.output ?? null;
}

/** What a devlog's image or video shows, in a sentence or two, for the sprint review. */
export async function describeMedia(content: EvidenceContent, meter?: AiMeter) {
	const request = {
		instructions: stripIndents`
			${HONEST}
			Describe in one or two sentences what this media from a devlog shows.
		`,
		messages: [{ role: "user" as const, content: contentParts(content) }],
	};
	const started = Date.now();
	const result = await generateText({
		model: openai(AI_MODELS.curatorReview),
		...request,
	});
	traceGenerated(
		"describe_media",
		AI_MODELS.curatorReview,
		started,
		request,
		result,
	);
	await recordAiUsage(meter, AI_MODELS.curatorReview, result.usage);
	return result.text.trim() || null;
}
