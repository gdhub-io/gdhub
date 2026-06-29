import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { getRoomMemberIds, matrixIdToUserId } from "@/services/matrix/admin";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
	action: z.enum(["accepted", "declined"]),
});

type Body = z.infer<typeof BodySchema>;

/**
 * Notifies the chat counterpart (the inviter, in a 1:1 DM) when the current
 * user accepts or declines a chat invitation. Membership changes happen
 * client-side via matrix-js-sdk, so the client calls this after join/leave.
 */
export const POST = withAuth({ mode: "user" })(
	withValidation(BodySchema)(async (_req, ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const { id: roomId } = (await ctx.params) as { id: string };
		const { action } = body as Body;

		const actor = await prisma.user.findUnique({
			where: { id: currentUser.id },
			select: { name: true },
		});
		const actorName = actor?.name || "Someone";

		// counterparts = current room members other than the actor (the inviter,
		// for an admin-created 1:1 DM)
		let counterpartIds: string[] = [];
		try {
			const memberIds = await getRoomMemberIds(roomId);
			counterpartIds = Array.from(
				new Set(
					memberIds
						.map(matrixIdToUserId)
						.filter((id): id is string => !!id && id !== currentUser.id),
				),
			);
		} catch (error) {
			console.error("[chat/invite-response] failed to read members", error);
		}

		if (counterpartIds.length === 0) {
			return json({ notified: 0 });
		}

		const recipients = await prisma.user.findMany({
			where: { id: { in: counterpartIds } },
			select: { id: true, email: true },
		});

		const accepted = action === "accepted";
		const title = accepted
			? "Chat invitation accepted"
			: "Chat invitation declined";
		const message = accepted
			? `${actorName} accepted your chat invitation.`
			: `${actorName} declined your chat invitation.`;
		const redirectUrl = accepted
			? `${process.env.NEXT_PUBLIC_APP_URL}/hub?chat=1&roomId=${roomId}`
			: `${process.env.NEXT_PUBLIC_APP_URL}/hub`;

		await Promise.all(
			recipients.map((recipient) =>
				NovuService.send({
					template: "default-message",
					to: {
						subscriberId: recipient.id,
						email: recipient.email || undefined,
					},
					payload: {
						title,
						message,
						redirectUrl,
						redirectUrlType: "internal",
					},
				}).catch((error) => {
					console.error("[chat/invite-response] novu send failed", error);
				}),
			),
		);

		return json({ notified: recipients.length });
	}),
);
