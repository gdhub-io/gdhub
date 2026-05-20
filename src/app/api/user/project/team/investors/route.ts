import { z } from "zod";
import { json, withAuth, withValidation } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const InvestorsQuerySchema = z.object({
	teamId: z.string(),
});

type InvestorsQuery = z.infer<typeof InvestorsQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		InvestorsQuerySchema,
		"query",
	)(async (_req, _ctx, { body }) => {
		const { teamId } = body as InvestorsQuery;

		const teamInvestors = await prisma.teamInvestor.findMany({
			where: { teamId },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
						profile: {
							include: {
								preferredGenres: true,
								preferredLevels: true,
								preferredSettings: true,
							},
						},
					},
				},
			},
			orderBy: { purchasedAt: "desc" },
		});

		return json(teamInvestors);
	}),
);
