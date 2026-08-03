import { PayableType, PaymentStatus } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";

import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfVacancy } from "@/lib/space-ids";
import { getTransactionInvoiceUrl } from "@/services/paddle/server";
import { prisma } from "@/services/prisma";

const InvoiceQuerySchema = z.object({
	vacancyId: z.string(),
});

type InvoiceQuery = z.infer<typeof InvoiceQuerySchema>;

export const GET = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.vacancies.manage",
		idFrom: projectOfVacancy,
	}),
	withValidation(InvoiceQuerySchema, "query"),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { vacancyId } = body as InvoiceQuery;

	const vacancy = await prisma.teamVacancy.findFirst({
		where: { id: vacancyId },
		select: {
			id: true,
			team: { select: { project: { select: { authorId: true } } } },
		},
	});

	if (!vacancy) return apiError.notFound("Vacancy not found");
	if (vacancy.team?.project?.authorId !== currentUser.id) {
		return apiError.forbidden(
			"You do not have permission to access this vacancy",
		);
	}

	const payment = await prisma.payment.findFirst({
		where: {
			payableType: PayableType.VACANCY,
			payableId: vacancyId,
			status: PaymentStatus.COMPLETED,
			providerTransactionId: { not: null },
		},
		orderBy: { completedAt: "desc" },
	});

	if (!payment?.providerTransactionId) {
		return apiError.notFound("No paid invoice found for this vacancy");
	}

	const url = await getTransactionInvoiceUrl(payment.providerTransactionId);
	if (!url) {
		return apiError.notFound("Invoice is not available yet");
	}

	return json({ url });
});
