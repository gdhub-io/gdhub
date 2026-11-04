import { VacancyApplicationStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfApplication } from "@/lib/space-ids";
import { closeVacancyChats } from "@/services/chat/vacancy-keys";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

const IdSchema = z.object({
	id: z.string(),
});

type IdBody = z.infer<typeof IdSchema>;

export const PUT = pipe(
	withAuth({ mode: "user" }),
	// Without this guard any signed-in user could reject anyone's application
	// by passing an application id.
	withSpaceGuard({
		permission: "project.vacancies.review",
		idFrom: projectOfApplication,
	}),
	withValidation(IdSchema),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = body as IdBody;

	const rejected = await prisma.vacancyApplication.update({
		where: { id, status: VacancyApplicationStatus.Submitted },
		data: { status: VacancyApplicationStatus.Rejected, decidedAt: new Date() },
		select: {
			user: true,
			vacancy: { select: { id: true, title: true, team: true } },
		},
	});
	const rejectedCandidate = { ...rejected, team: rejected.vacancy.team };
	try {
		await closeVacancyChats(
			rejectedCandidate.vacancy.id,
			rejectedCandidate.user.id,
			{
				notice: {
					senderUserId: currentUser.id,
					text: "❌ The application was declined. This chat is now closed.",
				},
			},
		);
	} catch (e) {
		console.error("[vacancy-chat] close on reject failed", e);
	}

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
				redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/hub?chat=1`,
				redirectUrlType: "internal",
			},
		});

		console.info(`New notification was sent to ${rejectedCandidate.user.id}`);
	} catch (e) {
		console.error("[NovuService]", e);
	}

	return json({ success: true });
});
