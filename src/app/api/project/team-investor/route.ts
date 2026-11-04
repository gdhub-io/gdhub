import { Currency } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfTeam } from "@/lib/space-ids";
import { prisma } from "@/services/prisma";

const TeamInvestorCreateSchema = z.object({
	name: z.string(),
	comment: z.string().optional(),
	userId: z.string().optional(),
	teamId: z.string(),
	share: z.number(),
	currency: z.nativeEnum(Currency).optional(),
	value: z.number(),
	purchasedAt: z.string().optional(),
});

type TeamInvestorCreateBody = z.infer<typeof TeamInvestorCreateSchema>;

export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.equity.manage",
		idFrom: projectOfTeam,
	}),
	withValidation(TeamInvestorCreateSchema),
)(async (_req, _ctx, { body }) => {
	const data = body as TeamInvestorCreateBody;

	const result = await prisma.teamInvestor.create({
		data: {
			...data,
			currency: data.currency ?? Currency.USD,
			purchasedAt: data.purchasedAt ? new Date(data.purchasedAt) : undefined,
		},
	});

	return json(result);
});
