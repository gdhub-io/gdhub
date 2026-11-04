import { VacancyApplicationStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const QuerySchema = z.object({ id: z.string() });

/** The signed-in user's open application to a vacancy, if they have one: the one they may withdraw. */
export const GET = withAuth({ mode: "user" })(
	withValidation(
		QuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const { id } = body as z.infer<typeof QuerySchema>;
		const application = await prisma.vacancyApplication.findFirst({
			where: {
				vacancyId: id,
				userId: (user as SessionUser).id,
				status: VacancyApplicationStatus.Submitted,
			},
			select: { id: true, createdAt: true },
		});

		return json({ myApplication: application });
	}),
);
