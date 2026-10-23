import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";
import { stripIndents } from "common-tags";
import { z } from "zod";
import { AI_MODELS } from "@/config/ai-models";
import { EvidenceMatch } from "@/config/prisma-enums";
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
};

/** Does this evidence show what the task promised? Null when the model gives nothing. */
export async function judgeEvidence(
	evidence: EvidenceTask,
	content: EvidenceContent,
	meter?: AiMeter,
) {
	const { output, usage } = await generateText({
		model: openai(AI_MODELS.curatorReview),
		output: Output.object({ schema: judgeSchema, name: "evidence_match" }),
		instructions: stripIndents`
			${HONEST}
			Judge whether the evidence shows what the task promised. When nothing
			usable could be read, the answer is CannotTell — never a guess.
		`,
		messages: [
			{
				role: "user",
				content: [
					{
						type: "text",
						text: stripIndents`
							Task: ${evidence.task}
							Evidence: ${evidence.artifactType}${evidence.artifactName ? ` "${evidence.artifactName}"` : ""}
							${evidence.description ? `The author says: ${evidence.description}` : ""}
						`,
					},
					...contentParts(content),
				],
			},
		],
	});
	await recordAiUsage(meter, AI_MODELS.curatorReview, usage);
	return output ?? null;
}

/** What a devlog's image or video shows, in a sentence or two, for the sprint review. */
export async function describeMedia(content: EvidenceContent, meter?: AiMeter) {
	const { text, usage } = await generateText({
		model: openai(AI_MODELS.curatorReview),
		instructions: stripIndents`
			${HONEST}
			Describe in one or two sentences what this media from a devlog shows.
		`,
		messages: [{ role: "user", content: contentParts(content) }],
	});
	await recordAiUsage(meter, AI_MODELS.curatorReview, usage);
	return text.trim() || null;
}
