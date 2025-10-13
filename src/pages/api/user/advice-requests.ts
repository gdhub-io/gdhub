import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString } from "class-validator";
import {
	createHandler,
	Get,
	Query,
	Req,
	ValidationPipe,
} from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

class AdviceRequestQueryParams {
	@IsString()
	@IsOptional()
	teamId: string;

	@IsString()
	@IsOptional()
	projectId: string;

	@IsString()
	@IsOptional()
	advisorId: string;

	@IsEnum(prismaClient.AdviceRequestStatus, { each: true })
	@IsOptional()
	@Transform(({ value }) =>
		Array.isArray(value) ? value : value ? [value] : undefined,
	)
	status: prismaClient.AdviceRequestStatus[];
}

@NextAuthGuard("user")
class ApiAdviceRequestsHandler {
	constructor() {}

	@Get()
	public async list(
		@Req() req: NextApiRequestWithUser,
		@Query(ValidationPipe) {
			teamId,
			projectId,
			advisorId,
			status,
		}: AdviceRequestQueryParams,
	) {
		const needUserRequests = !teamId && !projectId && !advisorId;
		const userId = needUserRequests ? req.user.id : undefined;

		const adviceRequests = await prisma.adviceRequest.findMany({
			where: {
				project: { teamId, id: projectId },
				toUser: { id: advisorId },
				status: status ? { in: status } : undefined,
				OR: userId ? [{ fromUserId: userId }, { toUserId: userId }] : undefined,
			},
			select: {
				fromUser: {
					select: {
						id: true,
						image: true,
						profile: { select: { name: true } },
					},
				},
				toUser: {
					select: {
						id: true,
						image: true,
						profile: { select: { name: true } },
					},
				},
				project: { select: { id: true, name: true, coverImage: true } },
				fromTelegramUser: true,
				createdAt: true,
				finishedAt: true,
				status: true,
				id: true,
				comment: true,
				feedback: true,
				topic: true,
			},
			orderBy: { createdAt: "desc" },
		});

		return adviceRequests;
	}
}

export default createHandler(ApiAdviceRequestsHandler);
