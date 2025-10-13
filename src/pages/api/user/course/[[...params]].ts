import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IsString } from "class-validator";
import {
	createHandler,
	Delete,
	Param,
	Put,
	Query,
	ValidationPipe,
} from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class IDParamDto {
	@IsString()
	id: string;
}

@NextAuthGuard("user")
class ApiUserEventEndpointHandler {
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
