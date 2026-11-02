import { z } from "zod";
import { json, pipe, withAuth, withValidation } from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { projectOfVacancy } from "@/lib/space-ids";
import { reconcileListingFee } from "@/services/vacancies/listing-fee";

const ReconcileSchema = z.object({ vacancyId: z.string() });

/** Back from Paddle: asks whether the fee was paid, and publishes if it was. */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({
		permission: "project.vacancies.manage",
		idFrom: projectOfVacancy,
	}),
	withValidation(ReconcileSchema),
)(async (_req, _ctx, { body }) => {
	const { vacancyId } = body as z.infer<typeof ReconcileSchema>;

	return json({ paid: await reconcileListingFee(vacancyId) });
});
