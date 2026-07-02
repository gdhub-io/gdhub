import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { closeVacancyChats } from "@/services/chat/vacancy-keys";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

const WithdrawSchema = z.object({
	teamMemberId: z.string(),
});

type WithdrawBody = z.infer<typeof WithdrawSchema>;

export const PUT = withAuth({ mode: "user" })(
	withValidation(WithdrawSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { teamMemberId } = body as WithdrawBody;

		const deletedMember = await prisma.teamMember.delete({
			where: { id: teamMemberId },
			select: {
				user: { include: { profile: true } },
				vacancy: true,
				team: {
					select: {
						members: {
							where: { status: prismaClient.TeamMemberStatus.Founder },
							select: { userId: true, user: true },
						},
					},
				},
			},
		});

		if (!deletedMember.vacancy) return json({ success: true });

		// The application is gone — close the vacancy chat on both sides.
		try {
			await closeVacancyChats(deletedMember.vacancy.id, deletedMember.user.id);
		} catch (e) {
			console.error("[vacancy-chat] close on withdraw failed", e);
		}

		for (const founderMember of deletedMember.team.members) {
			try {
				await NovuService.send({
					template: "default-message",
					to: {
						subscriberId: founderMember.userId,
						// biome-ignore lint/style/noNonNullAssertion: original semantics
						email: founderMember.user.email!,
					},
					payload: {
						title: "Candidate rejected",
						message: `The candidate ${deletedMember.user.profile?.name || deletedMember.user.name} rejected his candidacy for the position ${deletedMember.vacancy.title}`,
					},
				});

				console.info("New notification was sent to " + founderMember.userId);
			} catch (e) {
				console.error("[NovuService]", e);
			}
		}

		return json({ success: true });
	}),
);
