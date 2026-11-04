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
import { startListingFeeCheckout } from "@/services/vacancies/listing-fee";

const CheckoutSchema = z.object({ vacancyId: z.string() });

/** The Paddle transaction to pay a vacancy's listing fee in the overlay. */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.vacancies.manage",
		idFrom: projectOfVacancy,
	}),
	withValidation(CheckoutSchema),
)(async (_req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const { vacancyId } = body as z.infer<typeof CheckoutSchema>;

	const transactionId = await startListingFeeCheckout(
		vacancyId,
		currentUser.id,
	);

	return json({ transactionId });
});
