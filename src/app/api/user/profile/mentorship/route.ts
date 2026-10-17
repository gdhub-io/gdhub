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
import {
	hasAcceptedCurrent,
	latestAcceptance,
} from "@/repositories/legal.repository";
import { userSpacesCacheKey } from "@/repositories/user-spaces";
import { syncUserAvailabilityToBrevo } from "@/services/brevo/sync";
import { cacheDelete } from "@/services/cache";
import { prisma } from "@/services/prisma";

/**
 * Mentorship is saved in one request: the switch travels with the details it
 * needs. Turning it on without saying what you can help with is not an offer of
 * anything, so the switch alone was never a state worth storing.
 *
 * The state lives on the speciality — next to the questions and the response
 * time it belongs with — and no longer in `User.roles`. That is also what makes
 * switching off remove the person from the experts showcase: the showcase reads
 * the same flag.
 */
const MentorshipSchema = z.object({
	enabled: z.boolean(),
	specialityId: z.string().optional(),
	// `nullish`, not `optional`: the form loads the speciality and sends its
	// fields back unchanged, and both columns are nullable. `optional()` accepts
	// a missing key but rejects an explicit null, so anyone who had never filled
	// in a response time could not turn mentorship on at all.
	timeForMentoring: z.string().nullish(),
	openForQuestions: z.array(z.string()).nullish(),
	/** The Advisor Agreement tick; needed only until the version in effect is accepted. */
	legal: LegalAcceptancesSchema.optional(),
});

type MentorshipBody = z.infer<typeof MentorshipSchema>;

/**
 * Current state, read from the database.
 *
 * Never from the session: the JWT is re-synced only every few minutes, so right
 * after saving — and for a while after a reload — it reports the previous
 * answer. That is what made the switch look stuck on.
 */
export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const [open, agreementAccepted, agreement] = await Promise.all([
		prisma.speciality.count({
			where: { userId: currentUser.id, isOpenForMentoring: true },
		}),
		hasAcceptedCurrent(currentUser.id, "AdvisorAgreement"),
		latestAcceptance(currentUser.id, "AdvisorAgreement"),
	]);

	return json({ enabled: open > 0, agreementAccepted, agreement });
});

export const PUT = withAuth({ mode: "user" })(
	withValidation(MentorshipSchema)(async (req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const { enabled, specialityId, timeForMentoring, openForQuestions, legal } =
			body as MentorshipBody;

		if (!enabled) {
			// Switching off closes every speciality, because the switch is one for
			// the whole profile. The questions and the response time stay: turning
			// mentorship back on should not mean filling them in again.
			await prisma.speciality.updateMany({
				where: { userId: currentUser.id, isOpenForMentoring: true },
				data: { isOpenForMentoring: false },
			});

			// The other half of Brevo's `AVAILABLE_FOR`.
			await syncUserAvailabilityToBrevo(currentUser.id);
			// The switch is also what opens and closes the advisor space, and the
			// header's list of spaces is cached for a minute — without this the
			// link lingers after it stops working.
			await cacheDelete(userSpacesCacheKey(currentUser.id));

			return json({ enabled: false });
		}

		if (!specialityId) {
			return apiError.badRequest(
				"A speciality is required to offer mentorship",
			);
		}

		// Switching on is concluding the Advisor Agreement: without it accepted,
		// the space does not open.
		const mustAccept = !(await hasAcceptedCurrent(
			currentUser.id,
			"AdvisorAgreement",
		));

		let updated: { count: number };
		try {
			updated = await prisma.$transaction(async (tx) => {
				// Scoped by `userId` as well as by id: without it this endpoint would let
				// anyone flip the mentorship flag on somebody else's speciality.
				const result = await tx.speciality.updateMany({
					where: { id: specialityId, userId: currentUser.id },
					data: {
						isOpenForMentoring: true,
						timeForMentoring: timeForMentoring || null,
						...(openForQuestions
							? { openForQuestions: { set: openForQuestions } }
							: {}),
					},
				});
				if (result.count > 0 && mustAccept) {
					await acceptLegal(tx, legal, ["AdvisorAgreement"], {
						userId: currentUser.id,
						context: "AdvisorJoin",
						meta: requestMeta(req),
					});
				}
				return result;
			});
		} catch (error) {
			if (error instanceof LegalError) return legalErrorResponse(error);
			throw error;
		}

		if (updated.count === 0) return apiError.notFound("Speciality not found");

		await syncUserAvailabilityToBrevo(currentUser.id);
		await cacheDelete(userSpacesCacheKey(currentUser.id));

		return json({ enabled: true });
	}),
);
