import { IsString } from "class-validator";
import { Preset } from "matrix-js-sdk";
import {
	Body,
	createHandler,
	ForbiddenException,
	Get,
	NotFoundException,
	Param,
	Post,
	Req,
} from "next-api-decorators";
import { NextAuthGuard } from "@/lib/api-middlewares";
import { MatrixService } from "@/services/matrix";
import { ensureMatrixUser, getMatrixUserToken } from "@/services/matrix-admin";
import { prisma } from "@/services/prisma";

class CreateDirectRoomBody {
	@IsString()
	userId!: string;
}

class SendMessageBody {
	@IsString()
	text!: string;
}

@NextAuthGuard("user")
class ChatRoomsHandler {
	@Get("/:id")
	async get(@Param("id") matrixRoomId: string) {
		const adviceRequest = await prisma.adviceRequest.findFirst({
			where: {
				matrixRoomId,
			},
			select: {
				topic: true,
				comment: true,
				project: {
					select: {
						id: true,
						name: true,
						coverImage: true,
					},
				},
			},
		});

		if (adviceRequest) {
			return { type: "advice-request", data: adviceRequest };
		}

		return { type: "default", data: null };
	}
}

export default createHandler(ChatRoomsHandler);
