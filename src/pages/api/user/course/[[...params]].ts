import { randomUUID } from "node:crypto";
import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import {
	IsBoolean,
	IsEnum,
	IsNumber,
	IsOptional,
	IsString,
	Min,
} from "class-validator";
import {
	BadRequestException,
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
	@IsOptional()
	slug?: string;

	@IsString()
	@IsOptional()
	shortLine?: string;

	@IsString()
	directionId: string;

	@IsEnum(prismaClient.$Enums.Language)
	@IsOptional()
	language?: prismaClient.$Enums.Language;

	@IsNumber()
	@Min(0)
	authorRate: number;

	@IsBoolean()
	agreedToTerms: boolean;
}

@NextAuthGuard("user")
class ApiUserCourseEndpointHandler {
	@Post()
	public async create(
		@Req() req: NextApiRequestWithUser,
		@Body(ValidationPipe) data: CreateCourseDto,
	) {
		if (!data.agreedToTerms) {
			throw new BadRequestException(
				"Course agreement must be accepted before creating a course",
			);
		}

		const slug =
			(data.slug && slugify(data.slug, { lower: true, strict: true })) ||
			`${slugify(data.name, { lower: true, strict: true })}-${randomUUID().slice(-6)}`;

		const course = await prisma.course.create({
			data: {
				name: data.name.trim(),
				slug,
				shortLine: data.shortLine?.trim() || null,
				directionId: data.directionId,
				language: data.language ?? prismaClient.$Enums.Language.en,
				status: prismaClient.$Enums.CourseStatus.Draft,
				createdById: req.user.id as string,
			},
		});

		// TODO(prisma): persist the author rate once the CourseTeacher model is
		// added to the @gdhub-io/gdhub-prisma package (see proposal at the
		// bottom of this PR description). Until then, the rate is accepted by
		// the API but not stored.
		void data.authorRate;

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

export default createHandler(ApiUserCourseEndpointHandler);
