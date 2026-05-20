import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const AddTelegramConnectionSchema = z.object({
	id: z.string(),
});

const AddConnectionSchema = z.object({
	telegram: AddTelegramConnectionSchema.optional(),
});

const AddDisconnectionSchema = z.object({
	telegram: z.boolean().optional(),
});

type AddConnectionBody = z.infer<typeof AddConnectionSchema>;
type AddDisconnectionBody = z.infer<typeof AddDisconnectionSchema>;

export const POST = withAuth({ mode: "user" })(
	withValidation(AddConnectionSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const data = body as AddConnectionBody;

		if (data?.telegram?.id) {
			await prisma.user.update({
				where: { id: currentUser.id },
				data: { telegramId: data.telegram.id },
			});
		}

		return json(null);
	}),
);

export const PUT = withAuth({ mode: "user" })(
	withValidation(AddDisconnectionSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const data = body as AddDisconnectionBody;

		if (data?.telegram === true) {
			await prisma.user.update({
				where: { id: currentUser.id },
				data: { telegramId: null },
			});
		}

		return json(null);
	}),
);
