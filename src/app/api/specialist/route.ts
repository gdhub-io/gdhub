import {
	ChatRoomKind,
	ChatRoomStatus,
	TeamMemberStatus,
	UserRole,
} from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { getCleanTextContent } from "@/helpers/content";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { getRoomMemberIds, matrixIdToUserId } from "@/services/matrix/admin";
import { prisma } from "@/services/prisma";

// Reads Matrix room membership to detect an accepted offer — never prerender.
export const dynamic = "force-dynamic";

const SpecialistQuerySchema = z.object({
	id: z.string(),
});

type SpecialistQuery = z.infer<typeof SpecialistQuerySchema>;

// The compact project card in the talent card clamps the pitch at this length.
const DESCRIPTION_LIMIT = 500;

// Confirmed memberships surface as "projects the specialist works on". An
// applicant/rejected/fired row is not a real participation.
const CONFIRMED_MEMBER_STATUSES = [
	TeamMemberStatus.Hired,
	TeamMemberStatus.Founder,
];

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

	for (const room of rooms) {
		const vacancyId = (room.context as { vacancyId?: string } | null)
			?.vacancyId;
		if (!vacancyId || !room.matrixRoomId) continue;

		// Only offers the CURRENT viewer sent (they own the vacancy's project).
		const vacancy = await prisma.teamVacancy.findUnique({
			where: { id: vacancyId },
			select: { team: { select: { project: { select: { authorId: true } } } } },
		});
		if (vacancy?.team?.project?.authorId !== authorId) continue;

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

		const isAdmin = currentUser.roles?.includes(UserRole.Admin);
		const activeSubscription = await prisma.user.activeSubscription(
			currentUser.id,
		);

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
						memberInTeams: {
							where: { status: { in: CONFIRMED_MEMBER_STATUSES } },
							orderBy: { startedAt: "desc" },
							select: {
								position: true,
								status: true,
								startedAt: true,
								finishedAt: true,
								team: {
									select: {
										_count: {
											select: {
												members: {
													where: { status: { in: CONFIRMED_MEMBER_STATUSES } },
												},
											},
										},
										project: {
											select: {
												id: true,
												name: true,
												slug: true,
												coverImage: true,
												description: true,
												videoLink: true,
												genre: true,
												platform: true,
												status: true,
												author: { select: { name: true, image: true } },
											},
										},
									},
								},
							},
						},
						// Confirmed event certificates only — a `pending:` externalId is
						// a placeholder before the document is actually issued.
						memberInEvents: {
							where: {
								certificate: {
									externalId: { not: { startsWith: "pending:" } },
								},
							},
							orderBy: { createdAt: "desc" },
							select: {
								event: {
									select: {
										title: true,
										type: true,
										slug: true,
										image: true,
										certificationOrganizerName: true,
									},
								},
								certificate: { select: { number: true, issuedAt: true } },
								mentors: {
									select: { name: true, user: { select: { name: true } } },
								},
							},
						},
					},
				},
				direction: true,
				availableProjects: activeSubscription
					? {
							where: !isAdmin
								? { project: { authorId: currentUser.id } }
								: undefined,
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

		const projects = specialist.user.memberInTeams
			.map((member) => {
				const project = member.team?.project;
				if (!project) return null;
				return {
					id: project.id,
					name: project.name,
					slug: project.slug,
					coverImage: project.coverImage,
					// The compact card shows a short plain-text pitch — don't ship the
					// whole description (or its markdown) for every membership.
					description: project.description
						? getCleanTextContent(project.description, DESCRIPTION_LIMIT)
						: null,
					videoLink: project.videoLink,
					genre: project.genre,
					platform: project.platform,
					projectStatus: project.status,
					author: project.author
						? { name: project.author.name, image: project.author.image }
						: null,
					// Confirmed members only — matches the "team size" shown on the card.
					teamSize: member.team?._count.members ?? 0,
					role: member.position,
					status: member.status,
					startedAt: member.startedAt,
					finishedAt: member.finishedAt,
					active: !member.finishedAt,
				};
			})
			.filter((p): p is NonNullable<typeof p> => !!p);

		const certificates = specialist.user.memberInEvents
			.map((member) => {
				if (!member.certificate) return null;
				return {
					number: member.certificate.number,
					issuedAt: member.certificate.issuedAt,
					mentors: member.mentors
						.map((mentor) => mentor.user?.name || mentor.name)
						.filter(Boolean),
					event: member.event
						? {
								title: member.event.title,
								type: member.event.type,
								slug: member.event.slug,
								image: member.event.image,
								organizerName: member.event.certificationOrganizerName,
							}
						: null,
				};
			})
			.filter((c): c is NonNullable<typeof c> => !!c);

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
