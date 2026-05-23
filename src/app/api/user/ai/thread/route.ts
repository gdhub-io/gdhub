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

const CreateThreadSchema = z.object({
	metadata: z.record(z.unknown()).optional(),
});

type CreateThreadBody = z.infer<typeof CreateThreadSchema>;

export const POST = withAuth({ mode: "user" })(
	withValidation(CreateThreadSchema)(async (req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { metadata } = body as CreateThreadBody;

		const thread = await langGraphService.createThread(metadata);
		const assistantId = await langGraphService.getDefaultAssistantId();

		await prisma.aIThread.create({
			data: {
				externalThreadId: thread.thread_id,
				assistantId,
				userId: currentUser.id,
				metadata: {
					...metadata,
					route: req.headers.get("pathname") ?? undefined,
				},
			},
		});

		return json(thread);
	}),
);
