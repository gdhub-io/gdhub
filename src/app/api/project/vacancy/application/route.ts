import { z } from "zod";
import {
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const QuerySchema = z.object({ id: z.string() });

/** The signed-in user's application to a vacancy, if they sent one. */
export const GET = withAuth({ mode: "user" })(
	withValidation(
		QuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const { id } = body as z.infer<typeof QuerySchema>;
		const teamMember = await prisma.teamMember.findFirst({
			where: { vacancyId: id, userId: (user as SessionUser).id },
			// The newest, as the other vacancy routes read it.
			orderBy: { createdAt: "desc" },
			select: { id: true },
		});

		return json({ myTeamMemberId: teamMember?.id ?? null });
	}),
);
