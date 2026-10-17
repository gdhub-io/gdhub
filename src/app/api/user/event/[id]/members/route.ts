import { EventMemberStatus } from "@gdhub-io/gdhub-prisma";
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
import { cacheGet, cacheSet } from "@/services/cache";
import { LegalService } from "@/services/legal";
import { prisma } from "@/services/prisma";

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "event.members.view", idFrom: "params.id" }),
)(async (_req, ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };

	const event = await prisma.event.findUnique({
		where: { id },
		select: { createdById: true },
	});

	if (!event) {
		return apiError.notFound("Event not found");
	}

	const members = await prisma.eventMember.findMany({
		where: { eventId: id },
		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					image: true,
					profile: { select: { name: true } },
				},
			},
			teamMember: {
				select: {
					id: true,
					position: true,
					startedAt: true,
					finishedAt: true,
					team: {
						select: {
							projectId: true,
							project: { select: { id: true, name: true, slug: true } },
						},
					},
				},
			},
			mentors: {
				select: {
					id: true,
					name: true,
					user: {
						select: {
							id: true,
							name: true,
							image: true,
							profile: { select: { name: true } },
						},
					},
					direction: { select: { id: true, name: true } },
				},
			},
			certificate: {
				select: {
					id: true,
					number: true,
					externalId: true,
					issuedAt: true,
				},
			},
		},
		orderBy: { createdAt: "asc" },
	});

	// Fetch envelope info from Documenso in parallel for members that
	// have a certificate. We grab status + team slug so we can build the
	// Documenso UI URL. Failures are ignored — the UI falls back to "Draft"
	// and hides the "View in Documenso" button.
	const legalService = new LegalService();
	const envelopeInfos = await Promise.all(
		members.map(async (m) => {
			if (!m.certificate) return null;
			const externalId = m.certificate.externalId;
			if (!externalId || externalId.startsWith("pending:")) return null;
			try {
				return await envelopeInfo(legalService, externalId);
			} catch (error) {
				console.error(
					`Failed to fetch envelope for cert ${m.certificate.number}`,
					error,
				);
				return null;
			}
		}),
	);

	const result = members.map((m, i) => {
		if (!m.certificate) return { ...m, certificate: null };
		const info = envelopeInfos[i];
		return {
			...m,
			certificate: {
				...m.certificate,
				status: info?.status ?? null,
				documentUrl:
					info && m.certificate.externalId
						? legalService.getDocumentUrl({
								teamUrl: info.teamUrl,
								envelopeId: m.certificate.externalId,
							})
						: null,
			},
		};
	});

	return json(result);
});

const AddEventMembersSchema = z.object({
	userIds: z.array(z.string()).min(1),
});

type AddEventMembersBody = z.infer<typeof AddEventMembersSchema>;

/**
 * Manually add members to an event. Used for people who attended but never
 * registered themselves (e.g. the registration form is already closed) and
 * still need a certificate.
 */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "event.members.manage", idFrom: "params.id" }),
	withValidation(AddEventMembersSchema),
)(async (_req, ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };
	const { userIds } = body as AddEventMembersBody;

	const event = await prisma.event.findUnique({
		where: { id },
		select: { createdById: true },
	});

	if (!event) {
		return apiError.notFound("Event not found");
	}

	const uniqueUserIds = [...new Set(userIds)];

	const foundUsers = await prisma.user.findMany({
		where: { id: { in: uniqueUserIds } },
		select: { id: true },
	});

	if (foundUsers.length !== uniqueUserIds.length) {
		return apiError.badRequest("Some users were not found");
	}

	// EventMember has no unique constraint on (eventId, userId) — dedup here.
	const existing = await prisma.eventMember.findMany({
		where: {
			eventId: id,
			userId: { in: uniqueUserIds },
			status: {
				in: [EventMemberStatus.Pending, EventMemberStatus.Approved],
			},
		},
		select: { userId: true },
	});

	const existingUserIds = new Set(existing.map((m) => m.userId));
	const newUserIds = uniqueUserIds.filter((uid) => !existingUserIds.has(uid));

	if (newUserIds.length) {
		await prisma.eventMember.createMany({
			data: newUserIds.map((userId) => ({
				eventId: id,
				userId,
				status: EventMemberStatus.Approved,
			})),
		});
	}

	return json({
		success: true,
		added: newUserIds.length,
		skipped: existingUserIds.size,
	});
});

// A signed or rejected envelope never changes again; one still out for
// signing is re-read after a minute.
const FINAL_ENVELOPE_STATUSES = new Set(["COMPLETED", "REJECTED"]);

async function envelopeInfo(legalService: LegalService, externalId: string) {
	const key = `documenso:envelope:${externalId}`;
	const hit = await cacheGet<{ status: string; teamUrl: string }>(key);
	if (hit) return hit;

	const envelope = await legalService.getEnvelope(externalId);
	const info = {
		status: envelope.status as string,
		teamUrl: envelope.team.url,
	};
	await cacheSet(
		key,
		info,
		FINAL_ENVELOPE_STATUSES.has(info.status) ? 24 * 60 * 60 : 60,
	);

	return info;
}
