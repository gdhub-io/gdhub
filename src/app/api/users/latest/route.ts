import { json, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export const GET = withAuth({ mode: "user" })(async () => {
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
			specialities: {
				where: {
					specialization: { not: "" },
				},
				select: {
					name: true,
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
		}));

	return json(result);
});
