import { createHandler, Get } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

@NextAuthGuard("user")
class ApiLatestUsersHandler {
	constructor() {}

	@Get()
	public async list() {
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

		return users
			.filter((u) => u.specialities.length > 0)
			.map((u) => ({
				id: u.id,
				image: u.image,
				speciality: u.specialities[0]?.name || "",
			}));
	}
}

export default createHandler(ApiLatestUsersHandler);
