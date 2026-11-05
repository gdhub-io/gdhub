import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs } from "ai";
import { stripIndents } from "common-tags";
import { AI_MODELS } from "@/config/ai-models";
import { capped } from "@/lib/checkpoints/curator-text";
import { aiModel } from "@/services/ai/model";
import { traceGenerated } from "@/services/ai-trace";
import { type AiMeter, recordAiUsage } from "@/services/ai-usage";

/** What the model answers when it could not open the page. */
const UNREADABLE = "UNREADABLE";

const INSTRUCTIONS = stripIndents`
	Open the exact URL the user gives with web search and write down what the page
	itself says, as plain text: its title, headings, paragraphs, lists and table
	rows, in the page's order and language. Transcribe; do not summarise, judge or
	add anything from other pages. If the page cannot be opened, needs a login, or
	only another page about it can be found, answer exactly ${UNREADABLE}.
`;

export type WebRead = { text: string; sources: string[] };

/**
 * A page our own reader could not read — it renders with JavaScript, or its site
 * turns automated requests away — read through OpenAI's web search instead. The
 * page is opened by OpenAI, not by our servers; the answer is a transcription,
 * so it is marked as such wherever it is used.
 */
export async function readViaWebSearch(
	link: string,
	maxChars: number,
	meter?: AiMeter,
): Promise<WebRead | null> {
	const request = {
		instructions: INSTRUCTIONS,
		prompt: link,
		tools: { web_search: openai.tools.webSearch({}) },
		stopWhen: stepCountIs(3),
	};
	const started = Date.now();
	try {
		const result = await generateText({
			model: aiModel(AI_MODELS.curatorReview),
			...request,
		});
		traceGenerated(
			"evidence_web_read",
			AI_MODELS.curatorReview,
			started,
			request,
			result,
		);
		await recordAiUsage(meter, AI_MODELS.curatorReview, result.totalUsage);

		const text = result.text.trim();
		if (!text || text.startsWith(UNREADABLE)) return null;
		return {
			text: capped(text, maxChars),
			sources: result.sources.flatMap((source) =>
				source.sourceType === "url" ? [source.url] : [],
			),
		};
	} catch (error) {
		console.error("[evidence] web search read failed", link, error);
		return null;
	}
}
