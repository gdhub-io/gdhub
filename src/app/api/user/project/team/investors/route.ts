import { z } from "zod";
import {
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfTeam } from "@/lib/space-ids";
import { scopeOf } from "@/services/access";
import { prisma } from "@/services/prisma";

const InvestorsQuerySchema = z.object({
	teamId: z.string(),
});

type InvestorsQuery = z.infer<typeof InvestorsQuerySchema>;

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "project.equity.view", idFrom: projectOfTeam }),
	withValidation(InvestorsQuerySchema, "query"),
)(async (_req, _ctx, { user, access, body }) => {
	const { teamId } = body as InvestorsQuery;
	const ownOnly = !!access && scopeOf(access, "project.equity.view") === "own";

	const teamInvestors = await prisma.teamInvestor.findMany({
		where: { teamId, ...(ownOnly ? { userId: (user as SessionUser).id } : {}) },
		include: {
			user: { select: { id: true, name: true, image: true } },
		},
		orderBy: { purchasedAt: "desc" },
	});

	return json(teamInvestors);
});
