import { PayableType, PaymentStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";

import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const PaymentInitSchema = z.object({
	vacancyId: z.string(),
});

type PaymentInitBody = z.infer<typeof PaymentInitSchema>;

// Placeholder fee (minor units) stored when the PENDING payment is created. The
// webhook overwrites it with the real amount from the Paddle transaction totals.
const LISTING_FEE_CENTS = 900;

// Ensures the vacancy exists and belongs to the current user's project.
// Returns a ready-to-return error response, or null when authorized.
async function authorizeVacancy(
	vacancyId: string,
	userId: string,
): Promise<Response | null> {
	const vacancy = await prisma.teamVacancy.findFirst({
		where: { id: vacancyId },
		select: {
			id: true,
			team: { select: { project: { select: { authorId: true } } } },
		},
	});

	if (!vacancy) {
		return apiError.notFound("Vacancy not found");
	}

	if (vacancy.team?.project?.authorId !== userId) {
		return apiError.forbidden(
			"You do not have permission to access this vacancy",
		);
	}

	return null;
}

export const POST = withAuth({ mode: "user" })(
	withValidation(PaymentInitSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const { vacancyId } = body as PaymentInitBody;

		try {
			const authError = await authorizeVacancy(vacancyId, currentUser.id);
			if (authError) return authError;

			// This payment represents the listing FEE (not the offered salary, which
			// lives on the vacancy). Reuse the latest one so repeated saves don't pile
			// up duplicates; status/amount of a completed fee stay untouched.
			const existing = await prisma.payment.findFirst({
				where: {
					payableType: PayableType.VACANCY,
					payableId: vacancyId,
				},
				orderBy: { createdAt: "desc" },
			});

			const providerPriceId =
				process.env.NEXT_PUBLIC_PADDLE_VACANCY_PRICE_ID || null;

			const payment = existing
				? await prisma.payment.update({
						where: { id: existing.id },
						data: { payerId: currentUser.id, providerPriceId },
					})
				: await prisma.payment.create({
						data: {
							amount: LISTING_FEE_CENTS,
							currency: "EUR",
							status: PaymentStatus.PENDING,
							payableType: PayableType.VACANCY,
							payableId: vacancyId,
							payerId: currentUser.id,
							providerPriceId,
						},
					});

			return json(payment);
		} catch (error) {
			console.error("[vacancy.payment]", error);
			throw error;
		}
	}),
);

export const DELETE = withAuth({ mode: "user" })(
	async (req, _ctx, { user }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const url = new URL(req.url);
		const vacancyId = url.searchParams.get("vacancyId");
		if (!vacancyId) return apiError.badRequest("vacancyId is required");

		try {
			const authError = await authorizeVacancy(vacancyId, currentUser.id);
			if (authError) return authError;

			// Only remove payments that haven't been completed — a paid listing fee
			// must never be deleted from history.
			await prisma.payment.deleteMany({
				where: {
					payableType: PayableType.VACANCY,
					payableId: vacancyId,
					status: { not: PaymentStatus.COMPLETED },
				},
			});

			return json({ success: true });
		} catch (error) {
			console.error("[vacancy.payment.delete]", error);
			throw error;
		}
	},
);
