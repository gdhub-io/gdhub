import { ExpertInvoicing } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { LegalAcceptancesSchema, LegalError } from "@/lib/legal/accept";
import { legalErrorResponse, requestMeta } from "@/lib/legal/http";
import { validPayoutAccount } from "@/lib/payout-account";
import { getPaidWork, savePaidWork } from "@/repositories/advisor/paid-work";

/** Advisor settings → Paid work, for whoever is asking. */
export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const expert = user as SessionUser | undefined;
	if (!expert) return apiError.unauthorized();

	return json(await getPaidWork(expert.id));
});

const PaidWorkSchema = z.object({
	holder: z.string().trim().min(2).max(140),
	account: z
		.string()
		.trim()
		.refine(validPayoutAccount, "Enter a full IBAN or account number")
		.optional(),
	invoicing: z.nativeEnum(ExpertInvoicing),
	legal: LegalAcceptancesSchema.optional(),
});

export const PUT = pipe(
	withAuth({ mode: "user" }),
	withValidation(PaidWorkSchema),
)(async (req, _ctx, { user, body }) => {
	const expert = user as SessionUser | undefined;
	if (!expert) return apiError.unauthorized();

	try {
		const result = await savePaidWork(
			expert.id,
			body as z.infer<typeof PaidWorkSchema>,
			requestMeta(req),
		);
		return result.ok
			? json(result.paidWork)
			: apiError.badRequest(result.error);
	} catch (error) {
		if (error instanceof LegalError) return legalErrorResponse(error);
		throw error;
	}
});
