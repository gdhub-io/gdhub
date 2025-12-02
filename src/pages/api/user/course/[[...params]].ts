import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IsEnum, IsString } from "class-validator";
import {
	Body,
	createHandler,
	Delete,
	Param,
	Post,
	Put,
	Query,
	Req,
	ValidationPipe,
} from "next-api-decorators";
import slugify from "slugify";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class IDParamDto {
	@IsString()
	id: string;
}

class CreateCourseDto {
	@IsString()
	name: string;

	@IsString()
	description: string;

	@IsString()
	directionId: string;

	@IsEnum(prismaClient.$Enums.Language)
	lang: prismaClient.$Enums.Language;
}

@NextAuthGuard("user")
class ApiUserEventEndpointHandler {
	@Post()
	public async create(
		@Req() req: NextApiRequestWithUser,
		@Body() body: CreateCourseDto,
	) {
		const course = await prisma.course.create({
			data: {
				...body,
				slug: slugify(body.name, { lower: true, strict: true }),
				createdById: req.user.id,
			},
		});

		return course;
	}

	@Put("/:id/publish")
	public async publish(@Param("id") id: string) {
		await prisma.course.update({
			where: { id },
			data: {
				status: prismaClient.$Enums.CourseStatus.Published,
				publishedAt: new Date().toISOString(),
			},
		});
	}

	@Put("/:id/unpublish")
	public async unpublish(@Param("id") id: string) {
		await prisma.course.update({
			where: { id },
			data: {
				status: prismaClient.$Enums.CourseStatus.Draft,
				publishedAt: null,
			},
		});
	}

	@Delete()
	public async delete(@Query(ValidationPipe) { id }: IDParamDto) {
		await prisma.course.delete({
			where: {
				id,
			},
		});

		return { success: true };
	}
}

export default createHandler(ApiUserEventEndpointHandler);
