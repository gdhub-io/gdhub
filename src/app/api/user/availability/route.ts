import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import {
	getAvailability,
	saveAvailability,
} from "@/repositories/user/availability";
import { syncUserAvailabilityToBrevo } from "@/services/brevo/sync";

/** The most hours a week the inputs accept (frame 02.25), as onboarding allows. */
const MAX_HOURS = 80;

const AvailabilitySchema = z.object({
	timeForWork: z
		.union([
			z.tuple([
				z.number().int().min(0).max(MAX_HOURS),
				z.number().int().min(0).max(MAX_HOURS),
			]),
			z.tuple([]),
		])
		.refine((range) => range.length === 0 || range[0] <= range[1], {
			message: "The lower bound must not exceed the upper one",
		})
		.optional(),
	isActive: z.boolean().optional(),
});

/** The signed-in person's time investment, for the header (GDHUB-141). */
export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const availability = await getAvailability(currentUser.id);
	if (!availability) return apiError.notFound("Profile not found");
	return json(availability);
});

export const PUT = withAuth({ mode: "user" })(
	withValidation(AvailabilitySchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const input = body as z.infer<typeof AvailabilitySchema>;

		const saved = await saveAvailability(currentUser.id, input);
		if (saved.changed && input.isActive !== undefined) {
			await syncUserAvailabilityToBrevo(currentUser.id);
		}

		return json(await getAvailability(currentUser.id));
	}),
);
