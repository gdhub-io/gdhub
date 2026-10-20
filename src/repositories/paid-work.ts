import { AuditAction, type ExpertInvoicing } from "@gdhub-io/gdhub-prisma";
import {
	type LegalAcceptanceInput,
	type RequestMeta,
	resolveLegal,
} from "@/lib/legal/accept";
import { normalisePayoutAccount } from "@/lib/payout-account";
import { maskAccount } from "@/repositories/checkpoint-payouts";
import {
	latestAcceptance,
	needsAcceptance,
} from "@/repositories/legal.repository";
import { appUrl, notify } from "@/services/checkpoint-notifications";
import { prisma } from "@/services/prisma";
import type { PaidWorkDto } from "@/types/checkpoints";

/** Advisor settings → Paid work: where an expert is paid and under which terms. */
export const getPaidWork = async (userId: string): Promise<PaidWorkDto> => {
	const [profile, terms] = await Promise.all([
		prisma.expertProfile.findUnique({
			where: { userId },
			select: { payoutHolder: true, payoutAccount: true, invoicing: true },
		}),
		latestAcceptance(userId, "ExpertServicesTerms"),
	]);

	return {
		holder: profile?.payoutHolder ?? null,
		account: profile?.payoutAccount ? maskAccount(profile.payoutAccount) : null,
		invoicing: profile?.invoicing ?? null,
		terms: terms && {
			version: terms.version,
			acceptedAt: terms.acceptedAt.toISOString(),
		},
		termsNeeded: needsAcceptance("ExpertServicesTerms", terms?.version),
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
	const [profile, terms, user] = await Promise.all([
		prisma.expertProfile.findUnique({
			where: { userId },
			select: { payoutHolder: true, payoutAccount: true, invoicing: true },
		}),
		latestAcceptance(userId, "ExpertServicesTerms"),
		prisma.user.findUnique({
			where: { id: userId },
			select: { id: true, email: true },
		}),
	]);

	const account = input.account
		? normalisePayoutAccount(input.account)
		: profile?.payoutAccount;
	if (!account)
		return { ok: false as const, error: "accountRequired" as const };

	const acceptances = needsAcceptance("ExpertServicesTerms", terms?.version)
		? resolveLegal(input.legal, ["ExpertServicesTerms"], {
				userId,
				context: "ExpertServices",
				meta,
				now,
			})
		: [];

	const holder = input.holder.trim();
	const accountChanged =
		!!profile?.payoutAccount && account !== profile.payoutAccount;
	const changed =
		holder !== profile?.payoutHolder ||
		account !== profile?.payoutAccount ||
		input.invoicing !== profile?.invoicing;
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
							meta: {
								holder: holder !== profile?.payoutHolder,
								account: account !== profile?.payoutAccount,
								invoicing: input.invoicing !== profile?.invoicing,
							},
						},
					}),
				]
			: []),
	]);

	// Against a hijacked account: the owner hears that the money now goes elsewhere.
	if (accountChanged && user) {
		await notify(user, `paid-work-account-${userId}-${now.getTime()}`, {
			title: "Your payout account was changed",
			message: `Payouts now go to ${maskAccount(account)}. If you did not change it, tell us at once.`,
			redirectUrl: `${appUrl()}/advisor/settings?section=paid-work`,
		});
	}

	return { ok: true as const, paidWork: await getPaidWork(userId) };
};
