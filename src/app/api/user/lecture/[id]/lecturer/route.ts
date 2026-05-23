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

export const POST = withAuth({ mode: "user" })(
	withValidation(LecturerRequestBodySchema)(
		async (_req, _ctx, { user, body }) => {
			const currentUser = user as SessionUser | undefined;
			if (!currentUser) return apiError.unauthorized();
			const data = body as LecturerRequestBody & { lectureId?: string };
			const { lectureId, ...other } = data;

			const lecture = await prisma.lecturerRequest.create({
				data: {
					...(other as any),
					user: { connect: { id: currentUser.id } },
					lecture: { connect: { id: lectureId as string } },
				},
			});

			return json(lecture);
		},
	),
);
