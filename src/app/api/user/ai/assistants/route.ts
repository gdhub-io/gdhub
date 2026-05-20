import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { langGraphService } from "@/services/langgraph";

const AssistantsQuerySchema = z.object({
	graphKey: z.string().optional(),
});

type AssistantsQuery = z.infer<typeof AssistantsQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		AssistantsQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { graphKey } = body as AssistantsQuery;

		const assistants = await langGraphService.listAssistants(graphKey);
		return json(assistants);
	}),
);
