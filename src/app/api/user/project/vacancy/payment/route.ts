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
	rateType: z.enum(["Hourly", "OneTime", "Monthly"]),
});

type PaymentInitBody = z.infer<typeof PaymentInitSchema>;

const PAID_VACANCY_FEE = 3; // EUR

export const POST = withAuth({ mode: "user" })(
	withValidation(PaymentInitSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const { vacancyId, rateType } = body as PaymentInitBody;

		try {
			const vacancy = await prisma.teamVacancy.findFirst({
				where: { id: vacancyId },
				include: {
					team: {
						select: {
							id: true,
							project: {
								select: {
									id: true,
									authorId: true,
								},
							},
						},
					},
				},
			});

			if (!vacancy) {
				return apiError.notFound("Vacancy not found");
			}

			if (vacancy.team?.project?.authorId !== currentUser.id) {
				return apiError.forbidden(
					"You do not have permission to access this vacancy",
				);
			}

			const payment = await prisma.payment.create({
				data: {
					amount: PAID_VACANCY_FEE,
					currency: "EUR",
					status: prismaClient.PaymentStatus.PENDING,
					rateType: rateType as any,
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
