/**
 * Which model each AI task runs on. Only OpenAI for now — the one key we hold;
 * moving a task to another provider is a change here and in its call.
 */
export const AI_MODELS = {
	callNotes: "gpt-6.1-sol",
	// Every text in the curator's voice: the letters are what the author pays for.
	curatorReview: "gpt-6.1-sol",
} as const;
