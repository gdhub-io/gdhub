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
	@Get()
	async list(@Req() req: NextApiRequestWithUser) {
		const user = await prisma.user.findUnique({ where: { id: req.user.id } });

		if (!user?.matrixUserId) throw new NotFoundException("Chat user not found");

		const token = await getMatrixUserToken(req.user.id);

		const matrixService = MatrixService.getInstance();
		const userChatClient = matrixService.init({
			accessToken: token.accessToken,
			userId: user.matrixUserId,
		});

		try {
			// Start the client to sync with server
			await userChatClient?.startClient();

			// Wait for initial sync to complete
			await new Promise<void>((resolve) => {
				if (!userChatClient) {
					resolve();
					return;
				}

				const onSync = (state: string) => {
					if (state === "PREPARED" || state === "SYNCING") {
						userChatClient.off("sync" as any, onSync);
						resolve();
					}
				};

				userChatClient.on("sync" as any, onSync);

				// Fallback timeout
				setTimeout(() => {
					userChatClient.off("sync" as any, onSync);
					resolve();
				}, 5000);
			});

			const rooms = await userChatClient?.getRooms();

			// Extract only serializable data from rooms
			const serializableRooms = (rooms || []).map((room) => ({
				roomId: room.roomId,
				name: room.name,
				topic:
					room.currentState.getStateEvents("m.room.topic", "")?.getContent()
						?.topic || "",
				canonicalAlias: room.getCanonicalAlias(),
				aliases: room.getAltAliases(),
				memberCount: room.getJoinedMemberCount(),
				myMembership: room.getMyMembership(),
				lastActiveTimestamp: room.getLastActiveTimestamp(),
				lastMessage: room.timeline[room.timeline.length - 1]
					? {
							eventId: room.timeline[room.timeline.length - 1].getId(),
							content: room.timeline[room.timeline.length - 1].getContent(),
							ts: room.timeline[room.timeline.length - 1].getTs(),
							sender: room.timeline[room.timeline.length - 1].getSender(),
						}
					: null,
			}));

			return serializableRooms;
		} finally {
			// Stop the client to free resources
			await matrixService.stopClient();
		}
	}

	@Get("/:roomId/messages")
	async getRoom(
		@Req() req: NextApiRequestWithUser,
		@Param("roomId") roomId: string,
	) {
		const user = await prisma.user.findUnique({ where: { id: req.user.id } });

		if (!user?.matrixUserId) throw new NotFoundException("Chat user not found");

		const token = await getMatrixUserToken(req.user.id);

		const matrixService = MatrixService.getInstance();
		const userChatClient = matrixService.init({
			accessToken: token.accessToken,
			userId: user.matrixUserId,
		});

		try {
			// Ensure client performs initial sync to have up-to-date room timeline
			await userChatClient?.startClient();

			// Wait for initial sync state
			await new Promise<void>((resolve) => {
				if (!userChatClient) {
					resolve();
					return;
				}

				const onSync = (state: string) => {
					if (state === "PREPARED" || state === "SYNCING") {
						userChatClient.off("sync" as any, onSync);
						resolve();
					}
				};

				userChatClient.on("sync" as any, onSync);

				// Fallback timeout in case sync event not received promptly
				setTimeout(() => {
					userChatClient.off("sync" as any, onSync);
					resolve();
				}, 5000);
			});

			const room = await userChatClient?.getRoom(roomId);
			const events = room?.getLiveTimeline().getEvents() || [];

			// Keep only message events and take last items
			const lastEvents = events
				.filter((e) => e.getType && e.getType() === "m.room.message")
				.slice(-25);

			// Resolve unique senders profiles
			const uniqueSenders = Array.from(
				new Set(lastEvents.map((e) => e.getSender()).filter(Boolean)),
			) as string[];
			const profiles = new Map<
				string,
				{ displayname?: string; avatar_url?: string }
			>();
			await Promise.all(
				uniqueSenders.map(async (userId) => {
					try {
						const profile = await userChatClient!.getProfileInfo(userId);
						const rawAvatar = (profile as any)?.avatar_url as
							| string
							| undefined;
						const avatarHttp = rawAvatar
							? userChatClient!.mxcUrlToHttp(
									rawAvatar,
									64,
									64,
									"scale",
									true,
								) || rawAvatar
							: undefined;
						profiles.set(userId, {
							displayname: (profile as any)?.displayname,
							avatar_url: avatarHttp,
						});
					} catch (_) {
						profiles.set(userId, {
							displayname: undefined,
							avatar_url: undefined,
						});
					}
				}),
			);

			const lastMessages = lastEvents
				.filter((e) => !!e.getSender())
				.map((message) => {
					const sender = message.getSender() as string;
					const profile = profiles.get(sender) || {};
					return {
						eventId: message.getId(),
						content: message.getContent(),
						ts: message.getTs(),
						sender,
						senderDisplayName: profile.displayname || undefined,
						senderAvatarUrl: profile.avatar_url || undefined,
					};
				});

			return lastMessages;
		} finally {
			// Stop client to free resources in API context
			await matrixService.stopClient();
		}
	}

	@Post("/direct")
	async createDirectRoom(
		@Req() req: NextApiRequestWithUser,
		@Body() body: CreateDirectRoomBody,
	) {
		const matrixService = MatrixService.getInstance();

		let otherUser = await prisma.user.findUnique({
			where: { id: body.userId },
			select: {
				id: true,
				name: true,
				matrixUserId: true,
				image: true,
				profile: { select: { name: true } },
			},
		});

		if (!otherUser) throw new NotFoundException("Other user not found");

		if (!otherUser.matrixUserId) {
			const displayName =
				otherUser.profile?.name || otherUser.name || undefined;
			const avatarUrl = otherUser.image || undefined;

			const otherUserMatrixUser = await ensureMatrixUser(
				otherUser.id,
				displayName,
				avatarUrl,
			);

			otherUser = await prisma.user.update({
				where: { id: otherUser.id },
				data: { matrixUserId: otherUserMatrixUser.user_id },
				include: { profile: true },
			});
		}

		const user = await prisma.user.findUnique({ where: { id: req.user.id } });

		if (!user?.matrixUserId) throw new NotFoundException("Chat user not found");

		const token = await getMatrixUserToken(req.user.id);

		const userChatClient = matrixService.init({
			accessToken: token.accessToken,
			userId: user.matrixUserId,
		});

		const room = await userChatClient?.createRoom({
			is_direct: true,
			invite: [otherUser.matrixUserId!],
			preset: Preset.TrustedPrivateChat,
		});

		return room;
	}

	@Post("/:roomId/messages")
	async sendMessage(
		@Req() req: NextApiRequestWithUser,
		@Param("roomId") roomId: string,
		@Body() body: SendMessageBody,
	) {
		const user = await prisma.user.findUnique({ where: { id: req.user.id } });

		if (!user?.matrixUserId) throw new NotFoundException("Chat user not found");

		const token = await getMatrixUserToken(req.user.id);

		const matrixService = MatrixService.getInstance();
		const userChatClient = matrixService.init({
			accessToken: token.accessToken,
			userId: user.matrixUserId,
		});

		try {
			// For sending, full sync is not strictly required; send directly
			const res = await userChatClient?.sendTextMessage(roomId, body.text);

			return { ok: true, eventId: res?.event_id };
		} finally {
			await matrixService.stopClient();
		}
	}

	@Post("/:roomId/join")
	async join(
		@Req() req: NextApiRequestWithUser,
		@Param("roomId") roomId: string,
	) {
		const user = await prisma.user.findUnique({ where: { id: req.user.id } });

		if (!user?.matrixUserId) throw new NotFoundException("Chat user not found");

		const token = await getMatrixUserToken(req.user.id);

		const matrixService = MatrixService.getInstance();
		const userChatClient = matrixService.init({
			accessToken: token.accessToken,
			userId: user.matrixUserId,
		});

		try {
			const room = await userChatClient?.getRoom(roomId);
			const membership = room?.getMyMembership();
			if (membership !== "invite") {
				throw new ForbiddenException("You are not invited to this room");
			}

			await userChatClient?.joinRoom(roomId);
			return { ok: true };
		} finally {
			await matrixService.stopClient();
		}
	}

	@Post("/:roomId/leave")
	async leave(
		@Req() req: NextApiRequestWithUser,
		@Param("roomId") roomId: string,
	) {
		const user = await prisma.user.findUnique({ where: { id: req.user.id } });

		if (!user?.matrixUserId) throw new NotFoundException("Chat user not found");

		const token = await getMatrixUserToken(req.user.id);

		const matrixService = MatrixService.getInstance();
		const userChatClient = matrixService.init({
			accessToken: token.accessToken,
			userId: user.matrixUserId,
		});

		try {
			await userChatClient?.leave(roomId);
			return { ok: true };
		} finally {
			await matrixService.stopClient();
		}
	}
}

export default createHandler(ChatRoomsHandler);
