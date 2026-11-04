import { ChatRoomKind, ChatRoomStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import {
	mapPersonCardCertificates,
	mapPersonCardProjects,
	personCardCertificatesSelect,
	personCardProjectsSelect,
} from "@/repositories/user/person-card";
import { getSpaceAccess, isStaff } from "@/services/access";
import { getRoomMemberIds, matrixIdToUserId } from "@/services/matrix/admin";
import { prisma } from "@/services/prisma";

// Reads Matrix room membership to detect an accepted offer — never prerender.
export const dynamic = "force-dynamic";

const SpecialistQuerySchema = z.object({
	id: z.string(),
});

type SpecialistQuery = z.infer<typeof SpecialistQuerySchema>;

/**
 * Resolve an ACCEPTED vacancy-offer chat between the viewer (as project author)
 * and this specialist, returning the Matrix room id to open — or null.
 *
 * Acceptance lives in Matrix, not the DB: `ensureVacancyOfferChat` provisions a
 * room and invites the specialist, but the ChatRoom row stays Open whether or
 * not they joined. The Synapse admin members list contains only *joined* users,
 * so the specialist appearing there is exactly "they accepted the offer".
 */
async function resolveAcceptedOfferRoom(
	authorId: string,
	specialistUserId: string,
): Promise<string | null> {
	const rooms = await prisma.chatRoom.findMany({
		where: {
			kind: ChatRoomKind.VacancyOffer,
			status: ChatRoomStatus.Open,
			// directKey === `vacancy:{vacancyId}:{candidateUserId}`
			directKey: { endsWith: `:${specialistUserId}` },
			matrixRoomId: { not: null },
		},
		select: { matrixRoomId: true, context: true },
	});

	const candidates = rooms.flatMap((room) => {
		const vacancyId = (room.context as { vacancyId?: string } | null)
			?.vacancyId;
		return vacancyId && room.matrixRoomId
			? [{ matrixRoomId: room.matrixRoomId, vacancyId }]
			: [];
	});

	if (!candidates.length) return null;

	// Only offers the CURRENT viewer sent (they own the vacancy's project).
	// Resolved in one query — the Matrix membership calls below are already
	// expensive enough without a database round-trip per room.
	const ownedVacancies = await prisma.teamVacancy.findMany({
		where: {
			id: { in: candidates.map((candidate) => candidate.vacancyId) },
			team: { project: { authorId } },
		},
		select: { id: true },
	});
	const ownedVacancyIds = new Set(ownedVacancies.map((vacancy) => vacancy.id));

	for (const room of candidates) {
		if (!ownedVacancyIds.has(room.vacancyId)) continue;

		try {
			const memberIds = await getRoomMemberIds(room.matrixRoomId);
			const joined = memberIds
				.map(matrixIdToUserId)
				.filter((x): x is string => !!x);
			if (joined.includes(specialistUserId)) return room.matrixRoomId;
		} catch (error) {
			console.error("[specialist] membership check failed", error);
		}
	}

	return null;
}

export const GET = withAuth({ mode: "user" })(
	withValidation(
		SpecialistQuerySchema,
		"query",
	)(async (_req, _ctx, { user, body }) => {
		const { id } = body as SpecialistQuery;
		// withAuth({ mode: "user" }) guarantees `user` is present, but the
		// composed locals type erases that — narrow defensively.
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const [hubAccess, activeSubscription] = await Promise.all([
			getSpaceAccess("hub", null, currentUser),
			prisma.user.activeSubscription(currentUser.id),
		]);

		// Staff see every project a specialist is available for, not just their own.
		const seesEveryProject = isStaff(hubAccess);

		const specialist = await prisma.speciality.findFirst({
			where: { id },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						image: true,
						email: true,
						updatedAt: true,
						profile: {
							include: {
								preferredGenres: true,
								preferredLevels: true,
								preferredSettings: true,
							},
						},
						// Projects the specialist actually participates in.
						memberInTeams: personCardProjectsSelect,
						memberInEvents: personCardCertificatesSelect,
					},
				},
				direction: true,
				availableProjects: activeSubscription
					? {
							where: seesEveryProject
								? undefined
								: { project: { authorId: currentUser.id } },
							include: { project: { select: { name: true } } },
						}
					: undefined,
			},
		});

		if (!specialist) return apiError.notFound("Specialist not found");

		const viewerIsSelf = specialist.user.id === currentUser.id;

		// "Go to chat" / email reveal are unlocked once the specialist accepted an
		// offer from the viewer (a live chat exists between them).
		const chatRoomId = viewerIsSelf
			? null
			: await resolveAcceptedOfferRoom(currentUser.id, specialist.user.id);

		const projects = mapPersonCardProjects(specialist.user.memberInTeams);
		const certificates = mapPersonCardCertificates(
			specialist.user.memberInEvents,
		);

		return json({
			...specialist,
			user: {
				id: specialist.user.id,
				name: specialist.user.name,
				image: specialist.user.image,
				profile: specialist.user.profile,
				updatedAt: specialist.user.updatedAt,
				// Email is private until the offer is accepted (a chat exists).
				email: viewerIsSelf || chatRoomId ? specialist.user.email : null,
			},
			projects,
			certificates,
			// Presence of `chat` means an accepted offer → show "Go to chat".
			chat: chatRoomId ? { roomId: chatRoomId } : null,
		});
	}),
);
