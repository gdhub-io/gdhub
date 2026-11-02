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
import { prisma } from "@/services/prisma";
import { ensureListingFee } from "@/services/vacancies/listing-fee";

const PaymentInitSchema = z.object({
	vacancyId: z.string(),
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

export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.vacancies.manage",
		idFrom: projectOfVacancy,
	}),
	withValidation(PaymentInitSchema),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const { vacancyId } = body as PaymentInitBody;

	try {
		const authError = await authorizeVacancy(vacancyId, currentUser.id);
		if (authError) return authError;

		// The listing FEE, not the offered salary, which lives on the vacancy.
		const payment = await ensureListingFee(vacancyId, currentUser.id);

		return json(payment);
	} catch (error) {
		console.error("[vacancy.payment]", error);
		throw error;
	}
});

export const DELETE = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.vacancies.manage",
		idFrom: projectOfVacancy,
	}),
)(async (req, _ctx, { user }) => {
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
});
