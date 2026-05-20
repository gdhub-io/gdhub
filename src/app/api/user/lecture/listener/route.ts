import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const LectureIdQuerySchema = z.object({
	lectureId: z.string(),
});

type LectureIdQuery = z.infer<typeof LectureIdQuerySchema>;

export const POST = withAuth({ mode: "user" })(
	withValidation(
		LectureIdQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { lectureId } = body as LectureIdQuery;

		const lectureListener = await prisma.lectureListener.create({
			data: {
				lecture: { connect: { id: lectureId } },
				user: { connect: { id: currentUser.id } },
			},
		});

		return json(lectureListener);
	}),
);

export const DELETE = withAuth({ mode: "user" })(
	withValidation(
		LectureIdQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { lectureId } = body as LectureIdQuery;

		await prisma.lectureListener.deleteMany({
			where: { lectureId, userId: currentUser.id },
		});

		return json({ success: true });
	}),
);
