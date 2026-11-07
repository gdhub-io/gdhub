import { AsyncLocalStorage } from "node:async_hooks";
import { openai } from "@ai-sdk/openai";
import { type LanguageModelMiddleware, wrapLanguageModel } from "ai";
import { cassetteMode, withCassette } from "@/services/ai/cassette";

type Generated = Awaited<
	ReturnType<NonNullable<LanguageModelMiddleware["wrapGenerate"]>>
>;

// A recording loses the Date type of the response's timestamp on the way through JSON.
const revive = (result: Generated): Generated => ({
	...result,
	response: result.response && {
		...result.response,
		timestamp: result.response.timestamp
			? new Date(result.response.timestamp)
			: undefined,
	},
});

const chosen = new AsyncLocalStorage<string>();

/** Runs `run` with every model call inside it on `model` — the lab's comparison; production never sets it. */
export const withModel = <T>(
	model: string | undefined,
	run: () => Promise<T>,
) => (model ? chosen.run(model, run) : run());

/** The model a call actually runs on: the configured one, unless `withModel` chose another. */
export const modelId = (configured: string) => chosen.getStore() ?? configured;

/** The OpenAI model a feature calls; on the e2e stand it answers from cassettes. */
export const aiModel = (configured: string) => {
	const id = modelId(configured);
	const model = openai(id);
	if (!cassetteMode()) return model;

	return wrapLanguageModel({
		model,
		middleware: {
			specificationVersion: "v4",
			wrapGenerate: ({ doGenerate, params }) =>
				withCassette(
					id,
					{ prompt: params.prompt, responseFormat: params.responseFormat },
					async () => {
						const { request: _, ...result } = await doGenerate();
						return result;
					},
					revive,
				),
		},
	});
};
