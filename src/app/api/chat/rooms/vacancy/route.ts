import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { ensureVacancyOfferChat } from "@/services/chat/vacancy-offer";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

// server-side Matrix SDK via ensureVacancyOfferChat — never prerender
export const dynamic = "force-dynamic";

const VacancyChatSchema = z.object({
	vacancyId: z.string().min(1),
	candidateUserId: z.string().min(1),
	// Optional: present for talent-pool outreach (sent as the first message),
	// omitted when simply opening/ensuring the chat from an application card.
	message: z.string().trim().min(1).max(2000).optional(),
});

type VacancyChatBody = z.infer<typeof VacancyChatSchema>;

// Recruiter-initiated outreach from the talent pool: the project author opens a
// chat with a specialist about a specific vacancy and sends a first message.
export const POST = withAuth({ mode: "user" })(
	withValidation(VacancyChatSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const { vacancyId, candidateUserId, message } = body as VacancyChatBody;

		if (candidateUserId === currentUser.id) {
			return apiError.badRequest("Cannot start a chat with yourself");
		}

		const vacancy = await prisma.teamVacancy.findUnique({
			where: { id: vacancyId },
			select: {
				id: true,
				team: { select: { project: { select: { authorId: true } } } },
			},
		});

		const authorId = vacancy?.team?.project?.authorId;
		if (!vacancy || !authorId) return apiError.notFound("Vacancy not found");

		// Only the project author (the recruiter side) can reach out.
		if (authorId !== currentUser.id) {
			return apiError.forbidden("Only the project author can start this chat");
		}

		const candidate = await prisma.user.findUnique({
			where: { id: candidateUserId },
			select: { id: true, email: true },
		});
		if (!candidate) return apiError.notFound("Candidate not found");

		const chat = await ensureVacancyOfferChat({
			vacancyId,
			candidateUserId,
			initiatorUserId: currentUser.id,
			firstMessage: message,
		});

		// Notify the candidate only when a new chat was opened (talent-pool
		// outreach). Re-opening an existing chat from a card shouldn't notify.
		if (chat.created) {
			try {
				await NovuService.send({
					template: "default-message",
					to: {
						subscriberId: candidate.id,
						email: candidate.email || undefined,
					},
					payload: {
						title: "New chat invitation",
						message: `${currentUser.name || "A recruiter"} wants to discuss a vacancy with you.`,
						redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/hub?chat=1&roomId=${chat.roomId}`,
						redirectUrlType: "internal",
					},
				});
			} catch (error) {
				console.error("[chat/rooms/vacancy] novu invite failed", error);
			}
		}

		return json({
			roomId: chat.roomId,
			chatRoomId: chat.chatRoomId,
			created: chat.created,
		});
	}),
);
