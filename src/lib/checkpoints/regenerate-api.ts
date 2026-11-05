import { z } from "zod";
import { REGENERATE_HINT_MAX } from "@/config/checkpoint";
import { apiError } from "@/lib/api-handlers";

/** GDHUB-156: what the admin sends to regenerate an answer or rebuild a step. */
export const RegenerateSchema = z.object({
	hint: z.string().trim().max(REGENERATE_HINT_MAX).optional(),
});

/** Replace sends only the draft's one-time key: the server writes what it generated. */
export const ReplaceSchema = z.object({ draftKey: z.string().uuid() });

export const draftError = (error: "notFound" | "closed" | "failed") =>
	error === "notFound"
		? apiError.notFound()
		: error === "closed"
			? apiError.conflict("The step is no longer open")
			: apiError.internal("The AI gave nothing usable");

export const replaceError = (error: "notFound" | "gone" | "closed") =>
	error === "notFound"
		? apiError.notFound()
		: error === "gone"
			? apiError.notFound("The draft has expired or was already used")
			: apiError.conflict("The step is no longer open");
