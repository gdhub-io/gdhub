import { IsArray, IsOptional, IsString } from "class-validator";
import { createHandler, Get, Query, Req } from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class SearchQueryDto {
	@IsString()
	query: string;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	ids?: string[];
}

@NextAuthGuard("user")
class ApiSpeakersSearchHandler {
	@Get()
	async search(@Req() req: any, @Query() { query, ids }: SearchQueryDto) {
		// if (!req.user?.roles?.includes(prismaClient.UserRole.Admin)) {
		// 	return []
		// }

		// if (!query) return []

		console.log("ids", ids);

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
							{ user: { id: req.user?.id } },
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

		return specialities.map((s) => ({
			id: s.id,
			name: s.user?.profile?.name || s.user?.name || "",
			image: s.user?.image || "",
			speciality: s.name,
			direction: s.direction?.name || "",
		}));
	}
}

export default createHandler(ApiSpeakersSearchHandler);
