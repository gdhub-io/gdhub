import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const LecturerRequestBodySchema = z.record(z.unknown());

type LecturerRequestBody = z.infer<typeof LecturerRequestBodySchema>;

export const PUT = withAuth({ mode: "user" })(
	withValidation(LecturerRequestBodySchema)(
		async (_req, ctx, { user, body }) => {
			const currentUser = user as SessionUser | undefined;
			if (!currentUser) return apiError.unauthorized();
			const { requestId } = (await ctx.params) as { requestId: string };
			const data = body as LecturerRequestBody;

			const lecture = await prisma.lecturerRequest.update({
				where: { id: requestId },
				data,
			});

			return json(lecture);
		},
	),
);

export const DELETE = withAuth({ mode: "user" })(
	async (_req, ctx, { user }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { id: lectureId, requestId } = (await ctx.params) as {
			id: string;
			requestId: string;
		};

		await prisma.lecturerRequest.delete({
			where: { id: requestId, lectureId },
		});

		return json({ success: true });
	},
);
