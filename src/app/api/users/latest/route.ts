import { json, pipe, withAuth } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { prisma } from "@/services/prisma";

// Specialities and levels of other members are exactly what the talent pool
// gates, so the feed of new ones is gated by the same permission. Hiding the
// card while the endpoint stayed open only moved the leak one fetch away.
export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "hub.talent_pool.view" }),
)(async () => {
	const users = await prisma.user.findMany({
		where: {
			onboardingDone: true,
			profile: { isActive: true },
			specialities: {
				some: {
					specialization: { not: "" },
				},
			},
		},
		select: {
			id: true,
			image: true,
			createdAt: true,
			specialities: {
				where: {
					specialization: { not: "" },
				},
				select: {
					name: true,
					level: true,
				},
				take: 1,
				orderBy: { updatedAt: "desc" },
			},
		},
		orderBy: { createdAt: "desc" },
		take: 10,
	});

	const result = users
		.filter((u) => u.specialities.length > 0)
		.map((u) => ({
			id: u.id,
			image: u.image,
			speciality: u.specialities[0]?.name || "",
			// The hub card shows the level instead of a "recently joined" line that
			// said the same thing on every row, and how long ago they actually
			// joined — the list is already ordered by it.
			level: u.specialities[0]?.level ?? null,
			joinedAt: u.createdAt,
		}));

	return json(result);
});
