import { IsString } from "class-validator";
import {
	createHandler,
	Get,
	Query,
	Req,
	ValidationPipe,
} from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class GetProjectReportsDto {
	@IsString()
	slug: string;
}

@NextAuthGuard("user")
class ApiUserProjectReportsHandler {
	@Get()
	public async get(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) { slug }: GetProjectReportsDto,
	) {
		const reports = await prisma.projectReport.findMany({
			where: { project: { slug } },
			include: { project: true },
			orderBy: [{ publishedAt: "desc" }],
		});

		return reports;
	}
}

export default createHandler(ApiUserProjectReportsHandler);
