/**
 * Which model each AI task runs on. Only OpenAI for now — the one key we hold;
 * moving a task to another provider is a change here and in its call.
 */
export const AI_MODELS = {
	callNotes: "gpt-6.1-sol",
	curatorReview: "gpt-6.1-sol",
	curatorAssist: "gpt-6-luna",
} as const;
