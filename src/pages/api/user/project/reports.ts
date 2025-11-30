import { IsOptional, IsString } from "class-validator";
import {
	createHandler,
	ForbiddenException,
	Get,
	Query,
	Req,
	ValidationPipe,
} from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class GetProjectReportsDto {
	@IsString()
	@IsOptional()
	slug?: string;

	@IsString()
	@IsOptional()
	projectId?: string;
}

@NextAuthGuard("user")
class ApiUserProjectReportsHandler {
	@Get()
	public async get(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { slug, projectId }: GetProjectReportsDto,
	) {
		if (!projectId && !slug) {
			throw new ForbiddenException("Either projectId or slug is required");
		}

		const reports = await prisma.projectReport.findMany({
			where: { OR: [{ project: { slug } }, { projectId }] },
			include: { project: true },
			orderBy: [{ publishedAt: "desc" }],
		});

		return reports;
	}
}

export default createHandler(ApiUserProjectReportsHandler);
