import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { langGraphService } from "@/services/langgraph";
import { prisma } from "@/services/prisma";

const StateQuerySchema = z.object({
	threadId: z.string().optional(),
});

type StateQuery = z.infer<typeof StateQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		StateQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		let { threadId } = body as StateQuery;

		if (!threadId) {
			const lastThread = await prisma.aIThread.findFirst({
				where: { userId: currentUser.id },
				orderBy: { updatedAt: "desc" },
			});

			if (!lastThread) return json(null);

			threadId = lastThread.externalThreadId;
		}

		const state = await langGraphService.getThreadState(threadId);
		const messages = langGraphService.normalizeValuesToMessages(state.values);
		return json({ threadId, state, messages });
	}),
);
