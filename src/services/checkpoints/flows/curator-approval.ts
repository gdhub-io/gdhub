import { AuditAction } from "@gdhub-io/gdhub-prisma";
import { curatorStatusOf } from "@/lib/checkpoints/curator-status";
import { appUrl } from "@/lib/checkpoints/hrefs";
import {
	type CuratorDecision,
	curationSelect,
} from "@/repositories/checkpoints/curator-approval";
import { notify } from "@/services/checkpoints/notifications";
import { prisma } from "@/services/prisma";

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
