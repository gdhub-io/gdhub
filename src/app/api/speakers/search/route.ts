import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const SpeakersSearchQuerySchema = z.object({
	query: z.string(),
	ids: z.preprocess(
		(v) => (v == null ? undefined : Array.isArray(v) ? v : [v]),
		z.array(z.string()).optional(),
	),
});

type SpeakersSearchQuery = z.infer<typeof SpeakersSearchQuerySchema>;

export const GET = withAuth({ mode: "user" })(
	withValidation(
		SpeakersSearchQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { query, ids } = body as SpeakersSearchQuery;

		const q = query.trim();
		const idsArray = Array.isArray(ids) ? ids : ids ? [ids] : undefined;

		const specialities = await prisma.speciality.findMany({
			where: q
				? {
						OR: [
							{ user: { name: { contains: q, mode: "insensitive" } } },
							{
								user: {
									profile: { name: { contains: q, mode: "insensitive" } },
								},
							},
							{ name: { contains: q, mode: "insensitive" } },
							{ user: { id: currentUser.id } },
						],
					}
				: idsArray?.length
					? { id: { in: idsArray } }
					: {},
			include: {
				user: { include: { profile: { select: { name: true } } } },
				direction: true,
			},
			take: 20,
			orderBy: { updatedAt: "desc" },
		});

		return json(
			specialities.map((s) => ({
				id: s.id,
				name: s.user?.profile?.name || s.user?.name || "",
				image: s.user?.image || "",
				speciality: s.name,
				direction: s.direction?.name || "",
			})),
		);
	}),
);
