import { json, sharedCache } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export async function GET() {
	const specialities = await prisma.speciality.findMany({
		where: {
			user: { profile: { isActive: true } },
			specialization: { not: "" },
		},
		select: {
			name: true,
			level: true,
			specialization: true,
			direction: { select: { name: true } },
		},
		orderBy: { updatedAt: "desc" },
		take: 5,
	});

	const result = specialities.map((s: any) => ({
		...s,
		specialization:
			s.specialization.length > 100
				? `${s.specialization.slice(0, 100)}...`
				: s.specialization,
	}));

	return json(result, sharedCache(300));
}
