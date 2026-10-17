import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import {
	acceptLegal,
	LegalAcceptancesSchema,
	LegalError,
} from "@/lib/legal/accept";
import { legalErrorResponse, requestMeta } from "@/lib/legal/http";
import { pendingLegalCodes } from "@/repositories/legal.repository";
import { prisma } from "@/services/prisma";

const AcceptSchema = z.object({ legal: LegalAcceptancesSchema });

/**
 * The re-acceptance screen's Continue. Every document still pending for this
 * user must be in the body — the server decides what is pending, not the form.
 */
export const POST = withAuth({ mode: "user" })(
	withValidation(AcceptSchema)(async (req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const pending = await pendingLegalCodes(currentUser.id);
		try {
			await acceptLegal(
				prisma,
				(body as z.infer<typeof AcceptSchema>).legal,
				pending,
				{
					userId: currentUser.id,
					context: "ReAcceptance",
					meta: requestMeta(req),
				},
			);
		} catch (error) {
			if (error instanceof LegalError) return legalErrorResponse(error);
			throw error;
		}
		return json({ accepted: pending });
	}),
);
