import {
	PayableType,
	PaymentProvider,
	PaymentStatus,
} from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { checkoutHref } from "@/components/checkpoints/entry/hrefs";
import { checkpointPurchaseOpen } from "@/config/checkpoint-pricing";
import { env } from "@/helpers/env";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import {
	LegalAcceptancesSchema,
	LegalError,
	resolveLegal,
} from "@/lib/legal/accept";
import { legalErrorResponse, requestMeta } from "@/lib/legal/http";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfCheckpoint } from "@/lib/space-ids";
import {
	checkpointCheckout,
	pendingCheckout,
	reconcileCheckout,
} from "@/repositories/checkpoint-payment";
import { prisma } from "@/services/prisma";
import {
	createCheckpointCheckout,
	expireCheckout,
} from "@/services/stripe/server";

/**
 * Opens the checkout for a checkpoint and hands back the URL to send the author
 * to. It starts nothing: the checkpoint leaves `Draft` on the webhook and on
 * nothing else, so an abandoned checkout costs a `PENDING` row and no more.
 *
 * The return addresses are built here rather than accepted from the caller — a
 * checkout that redirects wherever it is told is an open redirect with a payment
 * attached to it.
 *
 * Pay is also where the purchase terms are accepted: the tick travels with the
 * click, and the acceptance is recorded with the checkout it opened.
 */
const PaySchema = z.object({ legal: LegalAcceptancesSchema });

export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.checkpoints.manage",
		idFrom: projectOfCheckpoint,
	}),
	withValidation(PaySchema),
)(async (req, ctx, { user, body }) => {
	const payer = user as SessionUser | undefined;
	if (!payer) return apiError.unauthorized();

	const { id } = (await ctx.params) as { id: string };

	if (!checkpointPurchaseOpen()) return apiError.badRequest("purchaseClosed");

	let acceptances: ReturnType<typeof resolveLegal>;
	try {
		acceptances = resolveLegal(
			(body as z.infer<typeof PaySchema>).legal,
			["CheckpointPurchaseTerms"],
			{
				userId: payer.id,
				context: "CheckpointPurchase",
				checkpointId: id,
				meta: requestMeta(req),
			},
		);
	} catch (error) {
		if (error instanceof LegalError) return legalErrorResponse(error);
		throw error;
	}

	// A checkout finished in another tab, whose webhook has not come, must not
	// be sold a second time.
	const earlier = await pendingCheckout(id);
	if (earlier) await reconcileCheckout(earlier);

	const quote = await checkpointCheckout(id);

	if (!quote.ok) {
		return quote.reason === "notFound"
			? apiError.notFound()
			: apiError.badRequest(quote.reason);
	}

	// A missing app URL would send a paying author to localhost, so NextAuth's
	// own URL stands in: it is required everywhere this runs.
	const base = env(
		"NEXT_PUBLIC_APP_URL",
		env("NEXTAUTH_URL", "http://localhost:3000"),
	);
	const slug = quote.checkpoint.project.slug;

	// A checkout left open keeps its row PENDING forever and would sit beside the
	// new one in the author's receipts. Only one attempt is live at a time, and
	// the old one is closed at Stripe too: paid later, nothing here would claim it.
	if (earlier?.providerTransactionId) {
		await expireCheckout(earlier.providerTransactionId).catch(() => null);
	}

	await prisma.payment.updateMany({
		where: {
			payableType: PayableType.CHECKPOINT,
			payableId: id,
			status: PaymentStatus.PENDING,
		},
		data: { status: PaymentStatus.CANCELED },
	});

	await prisma.legalAcceptance.createMany({ data: acceptances });

	const payment = await prisma.payment.create({
		data: {
			amount: quote.amount,
			currency: quote.currency,
			status: PaymentStatus.PENDING,
			payableType: PayableType.CHECKPOINT,
			payableId: id,
			payerId: payer.id,
			provider: PaymentProvider.STRIPE,
		},
		select: { id: true },
	});

	const session = await createCheckpointCheckout({
		paymentId: payment.id,
		checkpointId: id,
		amount: quote.amount,
		currency: quote.currency,
		name: quote.name,
		description: quote.description,
		customerEmail: payer.email ?? undefined,
		successUrl: `${base}${checkoutHref(slug, "ready")}`,
		cancelUrl: `${base}${checkoutHref(slug, "payment")}`,
	});

	if (!session.url) return apiError.internal("checkoutUnavailable");

	await prisma.payment.update({
		where: { id: payment.id },
		data: { providerTransactionId: session.id },
	});

	return json({ url: session.url });
});
