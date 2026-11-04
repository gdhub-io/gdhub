import {
	TeamVacancyStatus,
	VacancyApplicationStatus,
} from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { currentMembership } from "@/repositories/project/team";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

export const dynamic = "force-dynamic";

const ApplySchema = z.object({
	specialityId: z.string(),
	// Email is the default contact method — clients no longer send this.
	contactType: z.array(z.string()).default(["email"]),
	telegramNickname: z.string().optional(),
	applicationMessage: z.string().trim().max(1000).optional(),
	vacancyId: z.string(),
});

type ApplyBody = z.infer<typeof ApplySchema>;

export const POST = withAuth({ mode: "user" })(
	withValidation(ApplySchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const {
			specialityId,
			contactType,
			telegramNickname,
			applicationMessage,
			vacancyId,
		} = body as ApplyBody;

		if (contactType.includes("telegram") && telegramNickname) {
			await prisma.profile.update({
				where: { userId: currentUser.id },
				data: { tgNickname: telegramNickname },
			});
		}

		const vacancy = await prisma.teamVacancy.findUnique({
			where: { id: vacancyId },
			include: {
				team: {
					select: {
						project: {
							include: {
								author: true,
								equity: true,
								workflow: {
									select: {
										currentStepId: true,
									},
								},
							},
						},
					},
				},
			},
		});

		if (!vacancy || !currentUser.id) return json({ success: false });
		if (vacancy.status !== TeamVacancyStatus.Published) {
			return apiError.badRequest("This position is not open for applications");
		}

		const ownSpeciality = await prisma.speciality.count({
			where: { id: specialityId, userId: currentUser.id },
		});
		if (!ownSpeciality) return apiError.forbidden();

		if (await currentMembership(currentUser.id, { teamId: vacancy.teamId })) {
			return apiError.badRequest("You are already a member of this team");
		}

		// One open application per person and position; a withdrawn or rejected one
		// does not stand in the way of applying again.
		const open = await prisma.vacancyApplication.findFirst({
			where: {
				userId: currentUser.id,
				vacancyId,
				status: VacancyApplicationStatus.Submitted,
			},
			select: { id: true },
		});
		if (open) {
			return apiError.badRequest("You have already applied to this position");
		}

		const candidate = await prisma.vacancyApplication.create({
			data: {
				userId: currentUser.id,
				vacancyId,
				specialityId,
				allowedContacts: contactType,
				message: applicationMessage || null,
			},
			select: {
				id: true,
				user: { select: { name: true, profile: { select: { name: true } } } },
			},
		});

		const candidateName =
			candidate.user.profile?.name || candidate.user.name || "A candidate";

		// The chat is NOT auto-created here: the project author opens it from the
		// candidates page (POST /api/chat/rooms/vacancy) when they want to talk.

		try {
			await NovuService.send({
				template: "default-message",
				to: {
					// biome-ignore lint/style/noNonNullAssertion: original semantics
					subscriberId: vacancy.team!.project?.authorId!,
					// biome-ignore lint/style/noNonNullAssertion: original semantics
					email: vacancy.team!.project?.author.email!,
				},
				payload: {
					title: "New job response",
					message: `New job response for position "${vacancy.title}" from ${candidateName}`,
					// Deep-link to the project's candidates page — the author opens the
					// chat from there when they want to talk.
					// biome-ignore lint/style/noNonNullAssertion: original semantics
					redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/user/project/${vacancy.team!.project?.slug}`,
					redirectUrlType: "internal",
				},
			});

			console.info(
				// biome-ignore lint/style/noNonNullAssertion: original semantics
				`New notification was sent to ${vacancy.team!.project?.authorId}`,
			);
		} catch (e) {
			console.error("[NovuService]", e);
		}

		return json({ id: candidate.id });
	}),
);
