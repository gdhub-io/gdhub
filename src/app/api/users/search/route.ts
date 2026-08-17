import { z } from "zod";
import {
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { prisma } from "@/services/prisma";

const SearchSchema = z.object({
	q: z.string().optional(),
	/**
	 * The caller is left out by default — you do not start a chat with yourself
	 * or add yourself to an event you are already in. Granting a role is the
	 * other case: an admin making themselves a scout is ordinary, and without
	 * this they simply cannot find themselves in the picker.
	 */
	includeSelf: z
		.string()
		.optional()
		.transform((value) => value === "true"),
});

type SearchQuery = z.infer<typeof SearchSchema>;

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.users.view" }),
	withValidation(SearchSchema, "query"),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser;
	const { q, includeSelf } = body as SearchQuery;
	const query = q?.trim();

	const users = await prisma.user.findMany({
		where: {
			...(includeSelf ? {} : { id: { not: currentUser.id } }),
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
});
