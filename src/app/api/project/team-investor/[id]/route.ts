import { Currency } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfTeamInvestor } from "@/lib/space-ids";
import { prisma } from "@/services/prisma";

// No `teamId`: an investor row cannot be moved onto another team.
const TeamInvestorUpdateSchema = z.object({
	name: z.string().optional(),
	comment: z.string().optional(),
	userId: z.string().optional(),
	share: z.number().optional(),
	currency: z.nativeEnum(Currency).optional(),
	value: z.number().optional(),
	purchasedAt: z.string().optional(),
});

type TeamInvestorUpdateBody = z.infer<typeof TeamInvestorUpdateSchema>;

// Only the investor edit form reads one row, so it takes the same permission as editing it.
const manageInvestors = withSpaceGuard({
	permission: "project.equity.manage",
	idFrom: projectOfTeamInvestor,
});

export const GET = pipe(
	withAuth({ mode: "user" }),
	manageInvestors,
)(async (_req, ctx) => {
	const { id } = (await ctx.params) as { id: string };

	const result = await prisma.teamInvestor.findUnique({
		where: { id },
		include: {
			user: { select: { id: true, name: true, image: true } },
			team: { select: { id: true, name: true, projectId: true } },
		},
	});

	return json(result);
});

export const PUT = pipe(
	withAuth({ mode: "user" }),
	manageInvestors,
	withValidation(TeamInvestorUpdateSchema),
)(async (_req, ctx, { body }) => {
	const { id } = (await ctx.params) as { id: string };
	const data = body as TeamInvestorUpdateBody;

	const result = await prisma.teamInvestor.update({
		where: { id },
		data: {
			...data,
			currency: data.currency ?? Currency.USD,
			purchasedAt: data.purchasedAt ? new Date(data.purchasedAt) : undefined,
		},
	});

	return json(result);
});

export const DELETE = pipe(
	withAuth({ mode: "user" }),
	manageInvestors,
)(async (_req, ctx) => {
	const { id } = (await ctx.params) as { id: string };

	const result = await prisma.teamInvestor.delete({ where: { id } });

	return json(result);
});
