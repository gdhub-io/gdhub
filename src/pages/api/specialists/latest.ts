import { createHandler, Get } from "next-api-decorators";
import { prisma } from "@/services/prisma";

class ApiLatestSpecialistsHandler {
	constructor() {}

	@Get()
	public async list() {
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

		return specialities.map((s: any) => ({
			...s,
			specialization:
				s.specialization.length > 100
					? s.specialization.slice(0, 100) + "..."
					: s.specialization,
		}));
	}
}

export default createHandler(ApiLatestSpecialistsHandler);
