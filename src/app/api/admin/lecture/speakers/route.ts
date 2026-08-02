import { z } from "zod";
import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { prisma } from "@/services/prisma";

const SpeakersQuerySchema = z.object({
	lectureId: z.string(),
});

type SpeakersQuery = z.infer<typeof SpeakersQuerySchema>;

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.lectures.view" }),
	withValidation(SpeakersQuerySchema, "query"),
)(async (_req, _ctx, { body }) => {
	const { lectureId } = body as SpeakersQuery;
	const stages = await prisma.lecturerRequest.findMany({
		where: { lectureId },
		orderBy: { createdAt: "asc" },
		include: {
			user: {
				select: {
					id: true,
					name: true,
					image: true,
					specialities: { select: { id: true, name: true } },
				},
			},
		},
	});

	return json(stages);
});
