import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { EventType } from "matrix-js-sdk";
import {
	Body,
	createHandler,
	Get,
	Param,
	Post,
	Put,
	Req,
	ValidationPipe,
} from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { MatrixService } from "@/services/matrix";
import { ensureMatrixUser, getMatrixUserToken } from "@/services/matrix-admin";
import { prisma } from "@/services/prisma";

class AdviceRequestDto {
	@IsString()
	@IsNotEmpty()
	topic: string;

	@IsString()
	@IsNotEmpty()
	projectId: string;

	@IsString()
	@IsNotEmpty()
	toUserId: string;

	@IsString()
	@IsOptional()
	comment?: string;
}

@NextAuthGuard("user")
class ApiAdviceRequestHandler {
	@Post()
	public async create(
		@Req() req: NextApiRequestWithUser,
		@Body(ValidationPipe) {
			topic,
			projectId,
			toUserId,
			comment,
		}: AdviceRequestDto,
	) {
		await prisma.adviceRequest.create({
			data: { topic, projectId, toUserId, fromUserId: req.user.id, comment },
			include: {
				fromUser: true,
				toUser: true,
				project: true,
			},
		});
	}

	@Get("/:id")
	public async get(@Param("id") id: string) {
		const adviceRequest = await prisma.adviceRequest.findUnique({
			where: { id },
			include: {
				fromUser: true,
				toUser: true,
				project: true,
			},
		});

		return adviceRequest;
	}

	@Put("/:id/cancel")
	public async cancel(@Param("id") id: string) {
		await prisma.adviceRequest.update({
			where: { id },
			data: {
				status: prismaClient.AdviceRequestStatus.Closed,
				finishedAt: new Date(),
			},
		});
	}

	@Put("/:id/accept")
	public async accept(
		@Param("id") id: string,
		@Req() req: NextApiRequestWithUser,
	) {
		const adviceRequest = await prisma.adviceRequest.findUnique({
			where: { id },
			select: {
				id: true,
				topic: true,
				project: true,
				comment: true,
				toUser: true,
				fromUser: true,
			},
		});

		if (
			!adviceRequest ||
			adviceRequest.toUser.id !== req.user.id ||
			!adviceRequest.fromUser
		) {
			throw new Error("Advice request not found or you are not the expert");
		}

		// ensure that the expert has a matrix session
		const userMatrixUser = await ensureMatrixUser(
			adviceRequest.fromUser.id,
			adviceRequest.fromUser.email!,
		);
		const expertMatrixUser = await ensureMatrixUser(
			adviceRequest.toUser.id,
			adviceRequest.toUser.email!,
		);
		const expertSession = await getMatrixUserToken(adviceRequest.toUser?.id);

		// create a chat between the user and the expert
		const expertMatrixClient = MatrixService.getInstance().init({
			userId: expertMatrixUser.user_id,
			accessToken: expertSession.accessToken,
		});

		// create a chat and invite the user
		const adviceRequestRoom = await expertMatrixClient.createRoom({
			room_alias_name: `advreq-${adviceRequest.id}`,
			name: `${adviceRequest.project?.name}`,
			topic: adviceRequest.topic || undefined,
			is_direct: true,
			invite: [userMatrixUser.user_id],
		});

		if (adviceRequest.project?.coverImage) {
			const coverImageFile = await fetch(
				adviceRequest.project?.coverImage,
			).then((res) => res.blob());

			const roomAvatar = await expertMatrixClient.uploadContent(
				coverImageFile,
				{
					type: "image/png",
					name: `room-${adviceRequest.id}-avatar.png`,
				},
			);

			await expertMatrixClient.sendStateEvent(
				adviceRequestRoom.room_id,
				EventType.RoomAvatar,
				{
					url: roomAvatar.content_uri || undefined,
				},
			);
		}

		await prisma.adviceRequest.update({
			where: { id },
			data: {
				status: prismaClient.AdviceRequestStatus.Approved,
				matrixRoomId: adviceRequestRoom.room_id,
			},
		});
	}

	@Put("/:id/reject")
	public async reject(
		@Param("id") id: string,
		@Req() req: NextApiRequestWithUser,
	) {
		const adviceRequest = await prisma.adviceRequest.findUnique({
			where: { id },
			select: {
				toUserId: true,
			},
		});

		if (!adviceRequest || adviceRequest.toUserId !== req.user.id) {
			throw new Error("Advice request not found or you are not the expert");
		}

		await prisma.adviceRequest.update({
			where: { id },
			data: {
				status: prismaClient.AdviceRequestStatus.Rejected,
				finishedAt: new Date(),
			},
		});
	}
}

export default createHandler(ApiAdviceRequestHandler);
