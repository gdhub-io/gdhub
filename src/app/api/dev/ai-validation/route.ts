import { z } from "zod";
import { apiError, json, withValidation } from "@/lib/api-handlers";
import { aiValidation, type FieldInput } from "@/services/ai-validation";
import { FIELD_KINDS } from "@/services/ai-validation/prompts/field-kinds";

const devOnly = () => {
	if (process.env.NODE_ENV === "production") {
		return apiError.notFound("Not found");
	}
	return null;
};

const FieldSchema = z.object({
	key: z.string(),
	label: z.string().optional(),
	value: z.string(),
	kind: z.enum(Object.keys(FIELD_KINDS) as [string, ...string[]]),
	severity: z.enum(["error", "warning"]).optional(),
	skipRelevance: z.boolean().optional(),
});

const AiValidationTestSchema = z.object({
	fields: z.array(FieldSchema),
	locale: z.string().optional(),
});

type AiValidationTestBody = z.infer<typeof AiValidationTestSchema>;

/**
 * Dev-only endpoint that runs the real AI validation (OpenAI moderation +
 * relevance) so the tester UI makes a genuine network + model request. Gated
 * to non-production; returns the raw ValidationResult.
 */
export const POST = withValidation(AiValidationTestSchema)(
	async (_req, _ctx, { body }) => {
		const blocked = devOnly();
		if (blocked) return blocked;

		const { fields, locale } = body as AiValidationTestBody;

		if (!process.env.OPENAI_API_KEY) {
			return json(
				{ error: "OPENAI_API_KEY is not set — no AI request will be made" },
				{ status: 500 },
			);
		}

		const result = await aiValidation.validate(fields as FieldInput[], {
			locale,
		});
		return json(result);
	},
);
