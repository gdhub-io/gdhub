import { IsOptional, IsString } from "class-validator";
import {
	Body,
	createHandler,
	Delete,
	Get,
	Post,
	Put,
	Query,
	Req,
	ValidationPipe,
} from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class CreateProjectReportDto {
	@IsString()
	content: string;

	@IsString()
	@IsOptional()
	video?: string;

	@IsString()
	publishedAt: string;

	@IsString()
	projectId: string;
}

class UpdateProjectReportDto {
	@IsString()
	id: string;

	@IsString()
	content: string;

	@IsString()
	@IsOptional()
	video?: string;

	@IsString()
	@IsOptional()
	publishedAt: string;
}

class ParamIdDto {
	@IsString()
	id: string;
}

@NextAuthGuard("user")
class ApiProjectReportHandler {
	@Get()
	public async get(@Query(ValidationPipe) { id }: ParamIdDto) {
		const report = await prisma.projectReport.findFirst({
			where: { id },
			include: {
				project: {
					select: {
						id: true,
						name: true,
						slug: true,
						coverImage: true,
						description: true,
					},
				},
				author: {
					select: {
						id: true,
						name: true,
						image: true,
					},
				},
			},
		});

		return report;
	}

	@Post()
	public async create(
		@Req() req: NextApiRequestWithUser,
		@Body(ValidationPipe) {
			content,
			video,
			publishedAt,
			projectId,
		}: CreateProjectReportDto,
	) {
		await prisma.projectReport.create({
			data: { content, publishedAt, video, authorId: req.user.id!, projectId },
		});
	}

	@Put()
	public async update(
		@Req() req: NextApiRequestWithUser,
		@Body(ValidationPipe) {
			id,
			content,
			video,
			publishedAt,
		}: UpdateProjectReportDto,
	) {
		await prisma.projectReport.update({
			where: { id },
			data: { content, publishedAt, video },
		});
	}

	@Delete()
	public async delete(@Query(ValidationPipe) { id }: ParamIdDto) {
		await prisma.projectReport.delete({
			where: { id },
		});
	}
}

export default createHandler(ApiProjectReportHandler);
