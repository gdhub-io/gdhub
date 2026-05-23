import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

const IdSchema = z.object({
	id: z.string(),
});

type IdBody = z.infer<typeof IdSchema>;

export const PUT = withAuth({ mode: "user" })(
	withValidation(IdSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { id } = body as IdBody;

		const rejectedCandidate = await prisma.teamMember.update({
			where: { id, status: prismaClient.TeamMemberStatus.Applicant },
			data: { status: prismaClient.TeamMemberStatus.Rejected },
			select: { user: true, vacancy: true, team: true },
		});

		try {
			await NovuService.send({
				template: "default-message",
				to: {
					subscriberId: rejectedCandidate.user.id,
					// biome-ignore lint/style/noNonNullAssertion: original semantics
					email: rejectedCandidate.user.email!,
				},
				payload: {
					title: "Candidate rejected",
					message: `Your candidacy for a position on the team ${rejectedCandidate.team.name} has been rejected ${rejectedCandidate.vacancy?.title}`,
				},
			});

			console.info(`New notification was sent to ${rejectedCandidate.user.id}`);
		} catch (e) {
			console.error("[NovuService]", e);
		}

		return json({ success: true });
	}),
);
