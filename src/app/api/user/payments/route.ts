import { PayableType, PaymentStatus } from "@gdhub-io/gdhub-prisma";
import { apiError, json, type SessionUser, withAuth } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

/**
 * Billing history for the current user: every payment they made, newest first.
 * A row carries what it bought — the vacancy's title or the checkpoint's stage
 * and number — with the project beside it, so the table describes the purchase
 * rather than an id.
 */
export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const payments = await prisma.payment.findMany({
		where: { payerId: currentUser.id },
		orderBy: { createdAt: "desc" },
	});

	const vacancyIds = payments
		.filter((p) => p.payableType === PayableType.VACANCY)
		.map((p) => p.payableId);

	const checkpointIds = payments
		.filter((p) => p.payableType === PayableType.CHECKPOINT)
		.map((p) => p.payableId);

	const checkpoints = checkpointIds.length
		? await prisma.projectCheckpoint.findMany({
				where: { id: { in: checkpointIds } },
				select: {
					id: true,
					order: true,
					stageName: true,
					project: { select: { name: true } },
				},
			})
		: [];
	const checkpointById = new Map(checkpoints.map((c) => [c.id, c]));

	const vacancies = vacancyIds.length
		? await prisma.teamVacancy.findMany({
				where: { id: { in: vacancyIds } },
				select: {
					id: true,
					title: true,
					team: { select: { project: { select: { name: true, slug: true } } } },
				},
			})
		: [];
	const vacancyById = new Map(vacancies.map((v) => [v.id, v]));

	const result = payments.map((p) => {
		const vacancy =
			p.payableType === PayableType.VACANCY
				? vacancyById.get(p.payableId)
				: undefined;
		const checkpoint =
			p.payableType === PayableType.CHECKPOINT
				? checkpointById.get(p.payableId)
				: undefined;

		return {
			id: p.id,
			amount: p.amount,
			currency: p.currency,
			status: p.status,
			payableType: p.payableType,
			payableId: p.payableId,
			createdAt: p.createdAt,
			completedAt: p.completedAt,
			// A receipt is only retrievable once Paddle has settled the transaction.
			hasInvoice:
				p.status === PaymentStatus.COMPLETED && !!p.providerTransactionId,
			title:
				vacancy?.title ??
				(checkpoint ? `${checkpoint.stageName} · ${checkpoint.order}` : null),
			projectName:
				vacancy?.team?.project?.name ?? checkpoint?.project?.name ?? null,
		};
	});

	return json(result);
});
