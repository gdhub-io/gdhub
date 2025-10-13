import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IsString } from "class-validator";
import {
	Body,
	createHandler,
	Delete,
	Get,
	Put,
	Query,
	Req,
} from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class ParamsDto {
	@IsString()
	id: string;
}

@NextAuthGuard("user", [prismaClient.UserRole.Admin])
class ApiLecturerRequestAdminHandler {
	constructor() {}

	@Get()
	public async get(@Query() params: ParamsDto) {
		const response = await prisma.lecturerRequest.findFirst({
			where: { id: params.id },
		});

		return response;
	}

	// @Post()
	// public async post(@Req() req: NextApiRequestWithUser, @Body(ValidationPipe) data: CreateSeasonStageDto) {
	// 	const response = await prisma.seasonStage.create({ data })

	// 	return response
	// }

	@Put()
	public async update(
		@Req() req: NextApiRequestWithUser,
		@Query() params: ParamsDto,
		@Body() body: any,
	) {
		const { id, ...data } = body;
		return await prisma.lecturerRequest.update({
			where: { id: params.id },
			data,
		});
	}

	@Delete()
	public async delete(
		@Req() req: NextApiRequestWithUser,
		@Query() params: ParamsDto,
	) {
		return await prisma.lecturerRequest.delete({ where: { id: params.id } });
	}
}

export default createHandler(ApiLecturerRequestAdminHandler);
