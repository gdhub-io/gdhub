import { Currency } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const TeamInvestorUpdateSchema = z.object({
	name: z.string().optional(),
	comment: z.string().optional(),
	userId: z.string().optional(),
	teamId: z.string().optional(),
	share: z.number().optional(),
	currency: z.enum(Object.values(Currency) as [string, ...string[]]).optional(),
	value: z.number().optional(),
	purchasedAt: z.string().optional(),
});

type TeamInvestorUpdateBody = z.infer<typeof TeamInvestorUpdateSchema>;

export const GET = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

	const result = await prisma.teamInvestor.findUnique({
		where: { id },
		include: {
			user: true,
			team: true,
		},
	});

	return json(result);
});

export const PUT = withAuth({ mode: "user" })(
	withValidation(TeamInvestorUpdateSchema)(
		async (_req, ctx, { user, body }) => {
			const currentUser = user as SessionUser | undefined;
			if (!currentUser) return apiError.unauthorized();
			const { id } = (await ctx.params) as { id: string };
			const data = body as TeamInvestorUpdateBody;

			const result = await prisma.teamInvestor.update({
				where: { id },
				data: {
					...data,
					currency: (data.currency as Currency) || Currency.USD,
					purchasedAt: data.purchasedAt
						? new Date(data.purchasedAt)
						: undefined,
				},
			});

			return json(result);
		},
	),
);

export const DELETE = withAuth({ mode: "user" })(
	async (_req, ctx, { user }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { id } = (await ctx.params) as { id: string };

		const result = await prisma.teamInvestor.delete({ where: { id } });

		return json(result);
	},
);
