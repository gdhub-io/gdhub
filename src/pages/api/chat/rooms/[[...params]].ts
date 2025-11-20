import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import {
	createHandler,
	ForbiddenException,
	Get,
	NotFoundException,
	Param,
	Put,
	Req,
} from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { prisma } from "@/services/prisma";

const adviceRequestSelect = {
	id: true,
	topic: true,
	comment: true,
	status: true,
	finishedAt: true,
	matrixRoomId: true,
	fromUserId: true,
	toUserId: true,
	project: {
		select: {
			id: true,
			name: true,
			coverImage: true,
		},
	},
};

const buildAdviceRequestContext = (
	adviceRequest: any,
	currentUserId?: string,
) => {
	return {
		type: "advice-request",
		data: {
			id: adviceRequest.id,
			topic: adviceRequest.topic,
			comment: adviceRequest.comment,
			status: adviceRequest.status,
			finishedAt: adviceRequest.finishedAt,
			project: adviceRequest.project,
		},
		isExpert: currentUserId
			? adviceRequest.toUserId === currentUserId
			: undefined,
	};
};

@NextAuthGuard("user")
class ChatRoomsHandler {
	@Get("/:id")
	async get(
		@Req() req: NextApiRequestWithUser,
		@Param("id") matrixRoomId: string,
	) {
		const adviceRequest = await prisma.adviceRequest.findFirst({
			where: {
				matrixRoomId,
			},
			select: adviceRequestSelect,
		});

		if (adviceRequest) {
			return {
				...buildAdviceRequestContext(adviceRequest, req.user.id),
			};
		}

		return {
			type: "default",
			data: null,
		};
	}
	@Put("/:id/resolve")
	async resolve(
		@Req() req: NextApiRequestWithUser,
		@Param("id") matrixRoomId: string,
	) {
		const adviceRequest = await prisma.adviceRequest.findFirst({
			where: { matrixRoomId },
			select: adviceRequestSelect,
		});

		if (!adviceRequest) {
			throw new NotFoundException("Advice request not found");
		}

		const isParticipant =
			adviceRequest.fromUserId === req.user.id ||
			adviceRequest.toUserId === req.user.id;

		if (!isParticipant) {
			throw new ForbiddenException();
		}

		if (adviceRequest.status === prismaClient.AdviceRequestStatus.Closed) {
			return buildAdviceRequestContext(adviceRequest, req.user.id);
		}

		const updatedAdviceRequest = await prisma.adviceRequest.update({
			where: { id: adviceRequest.id },
			data: {
				status: prismaClient.AdviceRequestStatus.Closed,
				finishedAt: new Date(),
			},
			select: adviceRequestSelect,
		});

		return buildAdviceRequestContext(updatedAdviceRequest, req.user.id);
	}
}

export default createHandler(ChatRoomsHandler);
