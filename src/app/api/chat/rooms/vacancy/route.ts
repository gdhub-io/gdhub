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
import { projectOfVacancy } from "@/lib/space-ids";
import { ensureVacancyOfferChat } from "@/services/chat/vacancy-offer";
import { sendRoomMessageAs } from "@/services/matrix/admin";
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

// Recruiter-initiated outreach from the talent pool: someone who manages a
// project's vacancies opens a chat with a specialist about one of them.
//
// Two spaces are involved, so two guards compose: reaching a person from the
// talent pool is a hub permission, acting on behalf of the project is a project
// one. See docs/roles-and-permissions.md §3.4.
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "hub.talent_pool.contact" }),
	withSpaceGuard({
		permission: "project.vacancies.manage",
		idFrom: projectOfVacancy,
	}),
	withValidation(VacancyChatSchema),
)(async (_req, _ctx, { user, body }) => {
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

	const candidate = await prisma.user.findUnique({
		where: { id: candidateUserId },
		select: {
			id: true,
			email: true,
			name: true,
			profile: { select: { name: true } },
		},
	});
	if (!candidate) return apiError.notFound("Candidate not found");

	// Applied candidates are auto-joined — they responded to the vacancy and
	// are awaiting a reply, an accept-invite screen would be a redundant step.
	// Talent-pool outreach (no application) keeps the invite screen: the
	// specialist never asked for this conversation, their consent is the point.
	// Only an ACTIVE application counts — a rejected, withdrawn or hired one must not
	// auto-join the person or replay their old greeting.
	const application = await prisma.vacancyApplication.findFirst({
		where: {
			userId: candidateUserId,
			vacancyId,
			status: VacancyApplicationStatus.Submitted,
		},
		select: { id: true, message: true },
	});

	// Open the chat with the candidate's greeting from the apply form (unless
	// the author typed their own first message, e.g. a talent-pool offer).
	const candidateName = candidate.profile?.name || candidate.name;
	const firstMessage =
		message ||
		(application?.message
			? `💬 ${candidateName || "The candidate"}: "${application.message}"`
			: undefined);

	const chat = await ensureVacancyOfferChat({
		vacancyId,
		candidateUserId,
		initiatorUserId: currentUser.id,
		applicationId: application?.id,
		firstMessage,
		// Stored in context so the specialist reads it on the invite screen.
		offerMessage: !application ? message : undefined,
		autoJoinInvitees: !!application,
		// A bare "open chat" must not resurrect a chat that reject/hire closed.
		allowReopen: !!application || !!message,
	});

	// ensureChatRoom only delivers firstMessage on creation — for an existing
	// room the author's typed offer would be silently dropped. Deliver it.
	let messageDelivered = chat.created;
	if (!chat.created && message) {
		try {
			await sendRoomMessageAs(currentUser.id, chat.roomId, message);
			messageDelivered = true;
		} catch (error) {
			console.error("[chat/rooms/vacancy] message delivery failed", error);
		}
	}

	// Notify the candidate when a new chat was opened, they were re-invited
	// after leaving, OR a new offer message landed in an existing room. A
	// bare re-open of a chat they're already in shouldn't notify.
	if (chat.created || chat.reinvited || (messageDelivered && message)) {
		try {
			await NovuService.send({
				template: "default-message",
				to: {
					subscriberId: candidate.id,
					email: candidate.email || undefined,
				},
				payload: {
					title: application
						? "New message on your application"
						: "New chat invitation",
					message: application
						? `${currentUser.name || "The project author"} opened a chat about your application.`
						: `${currentUser.name || "A recruiter"} wants to discuss a vacancy with you.`,
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
});
