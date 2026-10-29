import type { AuditAction, PaymentProvider } from "@gdhub-io/gdhub-prisma";
import { prisma } from "@/services/prisma";
import type { PromoCodeDto } from "@/types/checkpoints";

/**
 * Written by hand: the audit extension only sees Prisma writes, and a promotion
 * code lives at the provider. Never fails the request — the provider has already
 * changed.
 */
export const logPromoCodeChange = async (
	provider: PaymentProvider,
	actorUserId: string,
	action: typeof AuditAction.CREATE | typeof AuditAction.UPDATE,
	promo: PromoCodeDto,
	meta: Record<string, unknown>,
) => {
	try {
		await prisma.auditLog.create({
			data: {
				actorUserId,
				entity: `${provider.toLowerCase()}_promotion_code`,
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
