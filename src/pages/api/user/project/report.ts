import { Prisma } from "@prisma/client";
import { IsObject, IsOptional, IsString } from "class-validator";
import dayjs from "dayjs";
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

	@IsObject()
	@IsOptional()
	contentEditor?: Prisma.JsonValue;

	@IsString()
	@IsOptional()
	video?: string;

	@IsString()
	@IsOptional()
	publishedAt?: string;

	@IsString()
	projectId: string;
}

class UpdateProjectReportDto {
	@IsString()
	id: string;

	@IsString()
	content: string;

	@IsObject()
	@IsOptional()
	contentEditor?: Prisma.JsonValue;

	@IsString()
	@IsOptional()
	video?: string;

	@IsString()
	@IsOptional()
	publishedAt?: string;
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
			contentEditor,
			video,
			publishedAt,
			projectId,
		}: CreateProjectReportDto,
	) {
		await prisma.projectReport.create({
			data: {
				content,
				contentEditor: contentEditor || Prisma.JsonNull,
				publishedAt: publishedAt || dayjs().toISOString(),
				video,
				authorId: req.user.id,
				projectId,
			},
		});
	}

	@Put()
	public async update(
		@Body(ValidationPipe) {
			id,
			content,
			contentEditor,
			video,
			publishedAt,
		}: UpdateProjectReportDto,
	) {
		await prisma.projectReport.update({
			where: { id },
			data: {
				content,
				contentEditor: contentEditor || Prisma.JsonNull,
				publishedAt,
				video,
			},
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
