import { AdviceRequestStatus, ChatRoomKind } from "@gdhub-io/gdhub-prisma";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { ensureChatRoom } from "@/services/chat/ensure-room";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

// Imports the server-side Matrix SDK via ensureChatRoom — keep dynamic
export const dynamic = "force-dynamic";

export const PUT = withAuth({ mode: "user" })(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = (await ctx.params) as { id: string };

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
		adviceRequest.toUser.id !== currentUser.id ||
		!adviceRequest.fromUser
	) {
		return apiError.badRequest(
			"Advice request not found or you are not the expert",
		);
	}

	// The expert accepts and their session creates the room. The requester asked
	// for this conversation, so they are auto-joined — no invite screen.
	const chat = await ensureChatRoom({
		kind: ChatRoomKind.AdviceRequest,
		directKey: `advice:${adviceRequest.id}`,
		title: adviceRequest.project?.name || undefined,
		topic: adviceRequest.topic || undefined,
		context: {
			adviceRequestId: adviceRequest.id,
			fromUserId: adviceRequest.fromUser.id,
			toUserId: adviceRequest.toUser.id,
		},
		initiatorUserId: adviceRequest.toUser.id,
		inviteeUserIds: [adviceRequest.fromUser.id],
		avatarUrl: adviceRequest.project?.coverImage || undefined,
		autoJoinInvitees: true,
	});

	// Dual-write during the migration: MyAdviceRequests and
	// UserAdviceArchiveModal still read AdviceRequest.matrixRoomId.
	const updatedAdviceRequest = await prisma.adviceRequest.update({
		where: { id },
		data: {
			status: AdviceRequestStatus.Approved,
			matrixRoomId: chat.roomId,
		},
		include: {
			fromUser: true,
			toUser: true,
			project: true,
		},
	});

	// send a notification to the user
	try {
		await NovuService.send({
			template: "default-message",
			to: {
				// biome-ignore lint/style/noNonNullAssertion: original semantics
				subscriberId: updatedAdviceRequest.fromUserId!,
				email: adviceRequest.fromUser?.email || undefined,
			},
			payload: {
				title: "Advice request accepted",
				message: `Advice request to ${updatedAdviceRequest.toUser?.name} was accepted. Start a chat with the expert to discuss the details.`,
				redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/hub?chat=1&roomId=${chat.roomId}`,
				redirectUrlType: "internal",
			},
		});
	} catch (error) {
		console.error("[NovuService]", error);
	}

	return json(updatedAdviceRequest);
});
