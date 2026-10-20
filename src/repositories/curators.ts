import { AuditAction, type Prisma } from "@gdhub-io/gdhub-prisma";
import { type CuratorStatus, curatorStatusOf } from "@/lib/curator-status";
import { hasPayoutDetails } from "@/lib/payout-account";
import {
	latestAcceptance,
	needsAcceptance,
} from "@/repositories/legal.repository";
import { appUrl, notify } from "@/services/checkpoint-notifications";
import { prisma } from "@/services/prisma";
import type { AdminCuratorRowDto, CurationDto } from "@/types/checkpoints";

/**
 * Project curation (GDHUB-74): an expert offers to curate and picks their
 * stages; an administrator approves the person — or declines or later revokes,
 * with a note — so random people are not offered to authors.
 */

const curationSelect = {
	curation: true,
	curatorStages: true,
	curatorRequestedAt: true,
	curatorApprovedAt: true,
	curatorReviewNote: true,
	payoutHolder: true,
	payoutAccount: true,
	invoicing: true,
} satisfies Prisma.ExpertProfileSelect;

/** `curatorStatusOf` as a filter. */
export const curatorStatusWhere = (
	status: CuratorStatus,
): Prisma.ExpertProfileWhereInput =>
	({
		pending: {
			curatorRequestedAt: { not: null },
			curatorApprovedAt: null,
			curatorReviewNote: null,
		},
		approved: { curatorApprovedAt: { not: null } },
		notApproved: { curatorApprovedAt: null, curatorReviewNote: { not: null } },
	})[status];

/** Every stage name the platform's workflow templates use, for the multi-select. */
export const stageNames = async () => {
	const schemas = await prisma.workflowSchema.findMany({
		select: { steps: true },
	});
	const names = schemas.flatMap((schema) =>
		(schema.steps as { name?: unknown }[]).flatMap((step) =>
			typeof step?.name === "string" ? [step.name] : [],
		),
	);
	return [...new Set(names)];
};

export const getCuration = async (userId: string): Promise<CurationDto> => {
	const [profile, terms, stages] = await Promise.all([
		prisma.expertProfile.findUnique({
			where: { userId },
			select: curationSelect,
		}),
		latestAcceptance(userId, "AdvisorAgreement"),
		stageNames(),
	]);

	return {
		// Curating is paid work: the agreement and the account come first.
		locked:
			needsAcceptance("AdvisorAgreement", terms?.version) ||
			!hasPayoutDetails(profile),
		on: profile?.curation ?? false,
		stages: profile?.curatorStages ?? [],
		stageOptions: stages,
		status: profile ? curatorStatusOf(profile) : null,
		requestedAt: profile?.curatorRequestedAt?.toISOString() ?? null,
		approvedAt: profile?.curatorApprovedAt?.toISOString() ?? null,
		note: profile?.curatorReviewNote ?? null,
	};
};

/**
 * The switch and the stages. Stages change freely; turning curation on for
 * the first time is what asks an admin.
 */
export const saveCuration = async (
	userId: string,
	{ on, stages }: { on: boolean; stages: string[] },
	now = new Date(),
) => {
	const current = await getCuration(userId);
	if (current.locked) return { ok: false as const, error: "locked" as const };

	const known = new Set(current.stageOptions);
	await prisma.expertProfile.update({
		where: { userId },
		data: {
			curation: on,
			curatorStages: [...new Set(stages)].filter((stage) => known.has(stage)),
			...(on && !current.requestedAt && { curatorRequestedAt: now }),
		},
	});

	return { ok: true as const, curation: await getCuration(userId) };
};

/** After a decline or a revoke: a fresh request, the old note gone. */
export const askAgain = async (userId: string, now = new Date()) => {
	const { count } = await prisma.expertProfile.updateMany({
		where: { userId, ...curatorStatusWhere("notApproved") },
		data: { curatorRequestedAt: now, curatorReviewNote: null, curation: true },
	});
	if (!count) return { ok: false as const, error: "notDeclined" as const };

	return { ok: true as const, curation: await getCuration(userId) };
};

export type CuratorsFilter = { pending?: boolean; query?: string };

export const listCurators = async ({
	pending,
	query,
}: CuratorsFilter): Promise<AdminCuratorRowDto[]> => {
	const profiles = await prisma.expertProfile.findMany({
		where: {
			curatorRequestedAt: { not: null },
			...(pending && curatorStatusWhere("pending")),
			...(query && {
				user: { name: { contains: query, mode: "insensitive" } },
			}),
		},
		select: {
			...curationSelect,
			user: {
				select: {
					id: true,
					name: true,
					image: true,
					specialities: {
						orderBy: { isOpenForMentoring: "desc" },
						select: { id: true, level: true },
					},
				},
			},
		},
		take: 200,
	});

	const rows = profiles.map((profile) => ({
		userId: profile.user.id,
		name: profile.user.name,
		image: profile.user.image,
		// The public expert page holds their experience and portfolio.
		specialityId: profile.user.specialities[0]?.id ?? null,
		level: profile.user.specialities[0]?.level ?? null,
		stages: profile.curatorStages,
		status: curatorStatusOf(profile) ?? "pending",
		requestedAt: profile.curatorRequestedAt?.toISOString() ?? null,
		approvedAt: profile.curatorApprovedAt?.toISOString() ?? null,
	}));

	// Waiting first, oldest request first; then approved, newest first; then not approved.
	const rank = { pending: 0, approved: 1, notApproved: 2 } as const;
	return rows.sort(
		(a, b) =>
			rank[a.status] - rank[b.status] ||
			(a.status === "pending"
				? (a.requestedAt ?? "").localeCompare(b.requestedAt ?? "")
				: (b.approvedAt ?? "").localeCompare(a.approvedAt ?? "")),
	);
};

export type CuratorDecision =
	| { action: "approve" }
	| { action: "decline" | "revoke"; note: string };

/** Approve, decline or revoke. Refused when the state moved since the admin looked. */
export const decideCurator = async (
	adminId: string,
	userId: string,
	decision: CuratorDecision,
	now = new Date(),
) => {
	const profile = await prisma.expertProfile.findUnique({
		where: { userId },
		select: {
			...curationSelect,
			user: { select: { id: true, email: true } },
		},
	});
	if (!profile?.curatorRequestedAt) {
		return { ok: false as const, error: "notFound" as const };
	}

	const status = curatorStatusOf(profile);
	const allowed =
		decision.action === "revoke" ? status === "approved" : status === "pending";
	if (!allowed) return { ok: false as const, error: "alreadyDecided" as const };

	const data =
		decision.action === "approve"
			? { curatorApprovedAt: now, curatorReviewNote: null }
			: { curatorApprovedAt: null, curatorReviewNote: decision.note.trim() };

	await prisma.$transaction([
		prisma.expertProfile.update({ where: { userId }, data }),
		prisma.auditLog.create({
			data: {
				actorUserId: adminId,
				entity: "curator",
				entityId: userId,
				action: AuditAction.UPDATE,
				// The decision, never the note: it is the admin's free text about a person.
				meta: { action: decision.action },
			},
		}),
	]);

	const settings = `${appUrl()}/advisor/settings?section=paid-work`;
	await notify(
		profile.user,
		`curator-${decision.action}-${userId}-${now.getTime()}`,
		decision.action === "approve"
			? {
					title: "You are approved as a project curator",
					message:
						"Authors are now offered you on the stages you chose. You can change them any time in Advisor settings.",
					redirectUrl: settings,
				}
			: {
					title: "GDHub has not approved you as a curator",
					message: `${decision.note.trim()} You can change your profile and ask again from Advisor settings.`,
					redirectUrl: settings,
				},
	);

	return { ok: true as const };
};
