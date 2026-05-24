import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const TeamInvestorCreateSchema = z.object({
	name: z.string(),
	comment: z.string().optional(),
	userId: z.string().optional(),
	teamId: z.string(),
	share: z.number(),
	currency: z
		.enum(Object.values(prismaClient.$Enums.Currency) as [string, ...string[]])
		.optional(),
	value: z.number(),
	purchasedAt: z.string().optional(),
});

type TeamInvestorCreateBody = z.infer<typeof TeamInvestorCreateSchema>;

export const POST = withAuth({ mode: "user" })(
	withValidation(TeamInvestorCreateSchema)(
		async (_req, _ctx, { user, body }) => {
			const currentUser = user as SessionUser | undefined;
			if (!currentUser) return apiError.unauthorized();
			const data = body as TeamInvestorCreateBody;

			const result = await prisma.teamInvestor.create({
				data: {
					...data,
					currency:
						(data.currency as prismaClient.$Enums.Currency) ||
						prismaClient.$Enums.Currency.USD,
					purchasedAt: data.purchasedAt
						? new Date(data.purchasedAt)
						: undefined,
				},
			});

			return json(result);
		},
	),
);
