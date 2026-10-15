import type { AuditAction } from "@gdhub-io/gdhub-prisma";
import type Stripe from "stripe";
import {
	CHECKPOINT_CURRENCY,
	CHECKPOINT_MINOR_UNITS,
} from "@/config/checkpoint";
import { prisma } from "@/services/prisma";
import { stripe } from "@/services/stripe/server";
import type { NewPromoCode, PromoCodeDto } from "@/types/checkpoints";

/**
 * Checkpoint promotion codes. Stripe is the only record: nothing is stored on our
 * side, so the list is always what Checkout will actually accept.
 */

/** An amount code must leave at least this much to charge, in minor units. */
const MIN_CHARGE_AFTER_DISCOUNT = 50;

const toDto = (promo: Stripe.PromotionCode): PromoCodeDto => {
	const coupon =
		typeof promo.promotion.coupon === "object" ? promo.promotion.coupon : null;

	return {
		id: promo.id,
		code: promo.code,
		percentOff: coupon?.percent_off ?? null,
		amountOff: coupon?.amount_off ?? null,
		timesRedeemed: promo.times_redeemed,
		maxRedemptions: promo.max_redemptions,
		expiresAt: promo.expires_at
			? new Date(promo.expires_at * 1000).toISOString()
			: null,
		firstPurchaseOnly: promo.restrictions.first_time_transaction,
		active: promo.active,
	};
};

const EXPAND = ["promotion.coupon"];

export const listPromoCodes = async () => {
	const page = await stripe().promotionCodes.list({
		limit: 100,
		expand: EXPAND.map((path) => `data.${path}`),
	});

	return page.data.map(toDto);
};

export const createPromoCode = async (input: NewPromoCode) => {
	const currency = CHECKPOINT_CURRENCY.toLowerCase();
	const amountOff =
		input.kind === "amount" ? input.value * CHECKPOINT_MINOR_UNITS : null;

	const coupon = await stripe().coupons.create({
		duration: "once",
		name: input.code,
		...(amountOff === null
			? { percent_off: input.value }
			: { amount_off: amountOff, currency }),
	});

	try {
		const promo = await stripe().promotionCodes.create({
			promotion: { type: "coupon", coupon: coupon.id },
			code: input.code,
			expires_at: input.expiresAt
				? Math.floor(new Date(input.expiresAt).getTime() / 1000)
				: undefined,
			max_redemptions: input.maxRedemptions ?? undefined,
			restrictions: {
				first_time_transaction: input.firstPurchaseOnly,
				// Never takes a checkpoint to zero: no intent would be made, and the payment would fail.
				...(amountOff !== null && {
					minimum_amount: amountOff + MIN_CHARGE_AFTER_DISCOUNT,
					minimum_amount_currency: currency,
				}),
			},
			expand: EXPAND,
		});

		return toDto(promo);
	} catch (error) {
		// The coupon is only ever reached through this code; without it, it is litter.
		await stripe()
			.coupons.del(coupon.id)
			.catch(() => null);
		throw error;
	}
};

/** Stripe never deletes a promotion code; it only turns it off and on again. */
export const setPromoCodeActive = async (id: string, active: boolean) =>
	toDto(await stripe().promotionCodes.update(id, { active, expand: EXPAND }));

export const isInvalidRequestError = (error: unknown) =>
	(error as { type?: string } | null)?.type === "StripeInvalidRequestError";

/** Stripe refusing a code because another one, active or not, already has it. */
export const isCodeTakenError = (error: unknown) => {
	const e = error as { code?: string; message?: string } | null;

	return (
		isInvalidRequestError(error) &&
		(e?.code === "resource_already_exists" ||
			/already exists/i.test(e?.message ?? ""))
	);
};

/** A Stripe id that names nothing, e.g. a promotion code PATCHed with a wrong id. */
export const isMissingResourceError = (error: unknown) =>
	isInvalidRequestError(error) &&
	(error as { code?: string }).code === "resource_missing";

/**
 * Written by hand: the audit extension only sees Prisma writes, and a promotion
 * code lives in Stripe. Never fails the request — Stripe has already changed.
 */
export const logPromoCodeChange = async (
	actorUserId: string,
	action: typeof AuditAction.CREATE | typeof AuditAction.UPDATE,
	promo: PromoCodeDto,
	meta: Record<string, unknown> = {},
) => {
	try {
		await prisma.auditLog.create({
			data: {
				actorUserId,
				entity: "stripe_promotion_code",
				entityId: promo.id,
				entityLabel: promo.code,
				action,
				meta: { code: promo.code, ...meta },
			},
		});
	} catch (error) {
		console.error("[promo-codes] failed to write the audit entry", error);
	}
};
