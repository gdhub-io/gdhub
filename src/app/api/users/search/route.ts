import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { z } from "zod";
import {
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const SearchSchema = z.object({
	q: z.string().optional(),
});

type SearchQuery = z.infer<typeof SearchSchema>;

export const GET = withAuth({
	mode: "user",
	roles: [prismaClient.UserRole.Admin],
})(
	withValidation(
		SearchSchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser;
		const { q } = body as SearchQuery;
		const query = q?.trim();

		const users = await prisma.user.findMany({
			where: {
				id: { not: currentUser.id },
				onboardingDone: true,
				email: { not: null },
				...(query
					? {
							OR: [
								{ name: { contains: query, mode: "insensitive" } },
								{ email: { contains: query, mode: "insensitive" } },
								{ profile: { name: { contains: query, mode: "insensitive" } } },
							],
						}
					: {}),
			},
			select: {
				id: true,
				name: true,
				email: true,
				image: true,
			},
			// no query → 10 latest registered users; query → name search
			orderBy: query ? { name: "asc" } : { createdAt: "desc" },
			take: query ? 20 : 10,
		});

		return json(users);
	}),
);
