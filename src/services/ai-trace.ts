import { AsyncLocalStorage } from "node:async_hooks";
import { modelId } from "@/services/ai/model";

/** One model call as the AI curator lab shows it: what was sent and what came back. */
export type AiTrace = {
	name: string;
	model: string;
	system: string;
	/** The messages as sent; images are listed by type and size, not as bytes. */
	messages: unknown;
	raw: string | null;
	inputTokens: number;
	outputTokens: number;
	ms: number;
};

const store = new AsyncLocalStorage<AiTrace[]>();

/**
 * Runs `work` and collects every model call made inside it. Only the lab
 * (`/dev/ai-curator`) does; everywhere else `traceAiCall` is a no-op.
 */
export const traced = async <T>(work: () => Promise<T>) => {
	const traces: AiTrace[] = [];
	const result = await store.run(traces, work);
	return { result, traces };
};

/** Built only inside a lab run, so production calls pay nothing for it. */
export const traceAiCall = (trace: () => AiTrace) => {
	store.getStore()?.push(trace());
};

/** A message part safe to show and copy: file bytes become their size. */
const shownPart = (part: unknown) => {
	if (
		part &&
		typeof part === "object" &&
		"data" in part &&
		part.data instanceof Uint8Array
	) {
		return { ...part, data: `${part.data.byteLength} bytes` };
	}
	return part;
};

type SdkMessage = { role: string; content: string | unknown[] };

/** Traces a Vercel AI SDK `generateText` call from its own request and result. */
export const traceGenerated = (
	name: string,
	model: string,
	started: number,
	request: { instructions: string; prompt?: string; messages?: SdkMessage[] },
	result: {
		text: string;
		usage: { inputTokens?: number; outputTokens?: number };
	},
) =>
	traceAiCall(() => ({
		name,
		model: modelId(model),
		system: request.instructions,
		messages: request.messages?.map((message) => ({
			...message,
			content: Array.isArray(message.content)
				? message.content.map(shownPart)
				: message.content,
		})) ?? [{ role: "user", content: request.prompt }],
		raw: result.text || null,
		inputTokens: result.usage.inputTokens ?? 0,
		outputTokens: result.usage.outputTokens ?? 0,
		ms: Date.now() - started,
	}));
