import { z } from "zod";
import {
	apiError,
	json,
	pipe,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { withSpaceGuard } from "@/lib/space-guard";
import { landingExpertWhere } from "@/repositories/content/landing";
import { prisma } from "@/services/prisma";

const FeaturedExpertSchema = z.object({ isFeatured: z.boolean() });

/**
 * Puts a person in the landing's "Top experts", or takes them out. An editorial
 * call, like featuring an event, so it sits with the hub's admin; the flag goes
 * on every speciality that makes them an expert there.
 */
export const PATCH = pipe(
	withAuth({ mode: "user" }),
	withSpaceGuard({ permission: "admin.users.manage" }),
	withValidation(FeaturedExpertSchema),
)(async (_req, ctx, { body }) => {
	const { id } = (await ctx.params) as { id: string };
	const { isFeatured } = body as z.infer<typeof FeaturedExpertSchema>;

	const { count } = await prisma.speciality.updateMany({
		where: { userId: id, ...landingExpertWhere },
		data: { isFeatured },
	});
	if (!count) {
		return apiError.badRequest(
			"This person has no expert speciality open to mentoring",
		);
	}

	return json({ isFeatured, specialities: count });
});
