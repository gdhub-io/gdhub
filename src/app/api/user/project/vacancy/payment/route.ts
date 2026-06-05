import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
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
	amount: z.number().positive(),
	rateType: z.enum(["Hourly", "OneTime", "Monthly"]),
});

type PaymentInitBody = z.infer<typeof PaymentInitSchema>;

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

		const { vacancyId, amount, rateType } = body as PaymentInitBody;

		try {
			const authError = await authorizeVacancy(vacancyId, currentUser.id);
			if (authError) return authError;

			// Reuse the latest payment for this vacancy so repeated edits update the
			// same record (the offered amount/rate) instead of piling up duplicates.
			// Status is left untouched — an already-completed listing fee stays paid.
			const existing = await prisma.payment.findFirst({
				where: {
					payableType: prismaClient.PayableType.VACANCY,
					payableId: vacancyId,
				},
				orderBy: { createdAt: "desc" },
			});

			const payment = existing
				? await prisma.payment.update({
						where: { id: existing.id },
						data: {
							amount,
							rateType: rateType as prismaClient.PaymentRateType,
						},
					})
				: await prisma.payment.create({
						data: {
							amount,
							currency: "EUR",
							status: prismaClient.PaymentStatus.PENDING,
							rateType: rateType as prismaClient.PaymentRateType,
							payableType: prismaClient.PayableType.VACANCY,
							payableId: vacancyId,
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
					payableType: prismaClient.PayableType.VACANCY,
					payableId: vacancyId,
					status: { not: prismaClient.PaymentStatus.COMPLETED },
				},
			});

			return json({ success: true });
		} catch (error) {
			console.error("[vacancy.payment.delete]", error);
			throw error;
		}
	},
);
