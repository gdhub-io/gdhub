import { z } from "zod";
import { json, withValidation } from "@/lib/api-handlers";
import { CONFIRMED_MEMBERS } from "@/repositories/project/team";
import { prisma } from "@/services/prisma";

const TeamQuerySchema = z.object({
	teamId: z.string(),
});

type TeamQuery = z.infer<typeof TeamQuerySchema>;

export const GET = withValidation(
	TeamQuerySchema,
	"query",
)(async (_req, _ctx, { body }) => {
	const { teamId } = body as TeamQuery;

	const team = await prisma.team.findFirst({
		where: { id: teamId },
		include: {
			members: {
				where: CONFIRMED_MEMBERS,
				include: { user: { select: { name: true, image: true } } },
			},
		},
	});

	return json(team);
});
