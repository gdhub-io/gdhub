import { createHandler, Get, Req } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

@NextAuthGuard("user")
class ApiUserEventsHandler {
	constructor() {}

	@Get()
	public async events(@Req() req: NextApiRequestWithUser) {
		const events = await prisma.event.findMany({
			where: {
				createdById: req.user.id,
			},
			include: {
				schedule: {
					include: {
						speakers: true,
					},
				},
			},
			orderBy: { createdAt: "asc" },
		});

		return events;
	}
}

export default createHandler(ApiUserEventsHandler);
