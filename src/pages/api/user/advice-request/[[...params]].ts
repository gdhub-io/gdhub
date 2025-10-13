import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { MsgType } from "matrix-js-sdk";
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
import { env } from "@/helpers/env";
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
		const adviceRequest = await prisma.adviceRequest.create({
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

		if (!adviceRequest || adviceRequest.toUser.id !== req.user.id) {
			throw new Error("Advice request not found or you are not the expert");
		}

		await prisma.adviceRequest.update({
			where: { id },
			data: { status: prismaClient.AdviceRequestStatus.Approved },
		});

		// ensure that the expert has a matrix session
		const userMatrixUser = await ensureMatrixUser(adviceRequest.fromUser!.id);
		const expertMatrixUser = await ensureMatrixUser(adviceRequest.toUser?.id);
		const expertSession = await getMatrixUserToken(adviceRequest.toUser?.id);

		// create a chat between the user and the expert
		const expertMatrixClient = MatrixService.getInstance().init({
			userId: expertMatrixUser.user_id,
			accessToken: expertSession.accessToken,
		});

		// create a chat and invite the user
		const adviceRequestRoom = await expertMatrixClient.createRoom({
			room_alias_name: `advreq-${adviceRequest.id}`,
			name: `Advice Request to ${adviceRequest.toUser.name}`,
			topic: adviceRequest.topic || undefined,
			is_direct: true,
			invite: [userMatrixUser.user_id],
		});

		// send special message (cooment from advice request)
		await expertMatrixClient.sendMessage(adviceRequestRoom.room_id, {
			body: `Hello <b>${req.user.name}</b>! You have sent an advice request on ${adviceRequest.topic} topic. \nProject: ${adviceRequest.project?.name}\nComment:\n<blockquote>${adviceRequest.comment || "(no comment)"}</blockquote>\nLet's discuss it in the chat.`,
			msgtype: MsgType.Text,
			format: "org.matrix.custom.html",
		});
	}

	@Put("/:id/decline")
	public async decline(
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
			data: { status: prismaClient.AdviceRequestStatus.Rejected },
		});
	}
}

export default createHandler(ApiAdviceRequestHandler);
