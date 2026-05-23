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

const SendMessageSchema = z.object({
	threadId: z.string().optional(),
	text: z.string(),
	assistantId: z.string().optional(),
	route: z.string().optional(),
});

type SendMessageBody = z.infer<typeof SendMessageSchema>;

export const POST = withAuth({ mode: "user" })(
	withValidation(SendMessageSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		let { threadId, text, assistantId, route } = body as SendMessageBody;

		if (!threadId) {
			const generatedChatName = `Chat ${new Date().toISOString().slice(0, 10)} ${new Date().toISOString().slice(11, 16)}`;

			const thread = await langGraphService.createThread({
				name: generatedChatName,
			});

			await prisma.aIThread.create({
				data: {
					externalThreadId: thread.thread_id,
					assistantId,
					userId: currentUser.id,
				},
			});

			threadId = thread.thread_id;
		}

		const values = await langGraphService.sendHumanMessageAndWait(
			threadId,
			text,
			assistantId,
			route,
		);
		const messages = langGraphService.normalizeValuesToMessages(values);

		await prisma.aIThread.update({
			where: {
				userId_externalThreadId: {
					userId: currentUser.id,
					externalThreadId: threadId,
				},
			},
			data: {
				lastMessageAt: new Date(),
			},
		});

		return json({ threadId, values, messages });
	}),
);
