import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import dayjs from "dayjs";
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

		const isTeamMember = await prisma.teamMember.findFirst({
			where: { userId: currentUser.id, teamId: vacancy?.teamId },
		});

		if (isTeamMember) {
			return apiError.badRequest("You are already a member of this team");
		}

		if (!vacancy || !currentUser.id) return json({ success: false });

		const candidate = await prisma.teamMember.create({
			data: {
				userId: currentUser.id,
				startedAt: dayjs().toISOString(),
				enteredProjectStepId: vacancy.team.project?.workflow?.currentStepId,
				vacancyId,
				teamId: vacancy.teamId,
				position: vacancy.title,
				status: prismaClient.TeamMemberStatus.Applicant,
				specialityId,
				allowedContacts: contactType,
				applicationMessage: applicationMessage || null,
			},
			include: { user: { include: { profile: true } } },
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

		return json(candidate);
	}),
);
