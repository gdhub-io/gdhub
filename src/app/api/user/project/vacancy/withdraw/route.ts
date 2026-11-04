import {
	TeamMemberStatus,
	VacancyApplicationStatus,
} from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { closeVacancyChats } from "@/services/chat/vacancy-keys";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

const WithdrawSchema = z.object({
	id: z.string(),
});

type WithdrawBody = z.infer<typeof WithdrawSchema>;

/**
 * The candidate takes back their own open application (GDHUB-127). The `where`
 * is the guard: another person's application, or one already decided, is not
 * found — no project permission is asked, because the candidate holds none.
 */
export const PUT = pipe(
	withAuth({ mode: "user" }),
	withValidation(WithdrawSchema),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { id } = body as WithdrawBody;

	const { count } = await prisma.vacancyApplication.updateMany({
		where: {
			id,
			userId: currentUser.id,
			status: VacancyApplicationStatus.Submitted,
		},
		data: {
			status: VacancyApplicationStatus.Withdrawn,
			decidedAt: new Date(),
		},
	});
	if (!count) return apiError.notFound("Application not found");

	const application = await prisma.vacancyApplication.findUniqueOrThrow({
		where: { id },
		select: {
			user: {
				select: { id: true, name: true, profile: { select: { name: true } } },
			},
			vacancy: {
				select: {
					id: true,
					title: true,
					team: {
						select: {
							members: {
								where: { status: TeamMemberStatus.Founder },
								select: { userId: true, user: { select: { email: true } } },
							},
						},
					},
				},
			},
		},
	});

	try {
		await closeVacancyChats(application.vacancy.id, application.user.id, {
			notice: {
				senderUserId: application.user.id,
				text: "↩️ The candidate withdrew the application. This chat is now closed.",
			},
		});
	} catch (e) {
		console.error("[vacancy-chat] close on withdraw failed", e);
	}

	const candidateName =
		application.user.profile?.name || application.user.name || "A candidate";
	for (const founder of application.vacancy.team.members) {
		try {
			await NovuService.send({
				template: "default-message",
				to: {
					subscriberId: founder.userId,
					// biome-ignore lint/style/noNonNullAssertion: original semantics
					email: founder.user.email!,
				},
				payload: {
					title: "Application withdrawn",
					message: `${candidateName} withdrew their application for the position ${application.vacancy.title}`,
				},
			});
		} catch (e) {
			console.error("[NovuService]", e);
		}
	}

	return json({ success: true });
});
