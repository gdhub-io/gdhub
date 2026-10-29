import { AuditAction, type ExpertInvoicing } from "@gdhub-io/gdhub-prisma";
import { appUrl } from "@/lib/checkpoints/hrefs";
import {
	type LegalAcceptanceInput,
	type RequestMeta,
	resolveLegal,
} from "@/lib/legal/accept";
import { maskAccount, normalisePayoutAccount } from "@/lib/payout-account";
import {
	latestAcceptance,
	needsAcceptance,
} from "@/repositories/legal.repository";
import { notify } from "@/services/checkpoints/notifications";
import { prisma } from "@/services/prisma";
import type { PaidWorkDto } from "@/types/checkpoints";

/** Advisor settings → Paid work: where an expert is paid and under which terms. */
export const getPaidWork = async (userId: string): Promise<PaidWorkDto> => {
	const [profile, terms] = await Promise.all([
		prisma.expertProfile.findUnique({
			where: { userId },
			select: { payoutHolder: true, payoutAccount: true, invoicing: true },
		}),
		latestAcceptance(userId, "AdvisorAgreement"),
	]);

	return {
		holder: profile?.payoutHolder ?? null,
		account: profile?.payoutAccount ? maskAccount(profile.payoutAccount) : null,
		invoicing: profile?.invoicing ?? null,
		terms: terms && {
			version: terms.version,
			acceptedAt: terms.acceptedAt.toISOString(),
		},
		termsNeeded: needsAcceptance("AdvisorAgreement", terms?.version),
	};
};

export type PaidWorkInput = {
	holder: string;
	/** Only when new or changed; the saved one is never sent back. */
	account?: string;
	invoicing: ExpertInvoicing;
	legal?: LegalAcceptanceInput[];
};

/**
 * Saves the payout details, with the terms in the same transaction when they
 * are not accepted yet. Any change stamps `payoutDetailsChangedAt`, which
 * refuses a payout an admin prepared against the old details.
 * Throws `LegalError` when the terms are missing or outdated.
 */
export const savePaidWork = async (
	userId: string,
	input: PaidWorkInput,
	meta: RequestMeta,
	now = new Date(),
) => {
	const [profile, terms] = await Promise.all([
		prisma.expertProfile.findUnique({
			where: { userId },
			select: { payoutHolder: true, payoutAccount: true, invoicing: true },
		}),
		latestAcceptance(userId, "AdvisorAgreement"),
	]);

	const account = input.account
		? normalisePayoutAccount(input.account)
		: profile?.payoutAccount;
	if (!account)
		return { ok: false as const, error: "accountRequired" as const };

	const acceptances = needsAcceptance("AdvisorAgreement", terms?.version)
		? resolveLegal(input.legal, ["AdvisorAgreement"], {
				userId,
				context: "PaidWork",
				meta,
				now,
			})
		: [];

	const holder = input.holder.trim();
	const diff = {
		holder: holder !== profile?.payoutHolder,
		account: account !== profile?.payoutAccount,
		invoicing: input.invoicing !== profile?.invoicing,
	};
	const changed = diff.holder || diff.account || diff.invoicing;
	const details = {
		payoutHolder: holder,
		payoutAccount: account,
		invoicing: input.invoicing,
		...(changed && { payoutDetailsChangedAt: now }),
	};

	await prisma.$transaction([
		prisma.expertProfile.upsert({
			where: { userId },
			create: { userId, ...details },
			update: details,
		}),
		...(acceptances.length
			? [prisma.legalAcceptance.createMany({ data: acceptances })]
			: []),
		...(changed
			? [
					prisma.auditLog.create({
						data: {
							actorUserId: userId,
							entity: "paid_work",
							entityId: userId,
							action: AuditAction.UPDATE,
							// That they changed, never what to: the values are personal.
							meta: diff,
						},
					}),
				]
			: []),
	]);

	// Against a hijacked account: the owner hears that the money now goes elsewhere.
	const user =
		diff.account && profile?.payoutAccount
			? await prisma.user.findUnique({
					where: { id: userId },
					select: { id: true, email: true },
				})
			: null;
	if (user) {
		await notify(user, `paid-work-account-${userId}-${now.getTime()}`, {
			title: "Your payout account was changed",
			message: `Payouts now go to ${maskAccount(account)}. If you did not change it, tell us at once.`,
			redirectUrl: `${appUrl()}/advisor/settings?section=paid-work`,
		});
	}

	return { ok: true as const, paidWork: await getPaidWork(userId) };
};
