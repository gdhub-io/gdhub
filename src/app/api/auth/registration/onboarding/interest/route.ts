import { PrimaryInterest } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const UpdateInterestSchema = z.object({
	preferredGenres: z.array(z.string()).optional(),
	preferredLevels: z.array(z.string()).optional(),
	preferredSettings: z.array(z.string()).optional(),
	primaryInterest: z
		.enum(Object.values(PrimaryInterest) as [string, ...string[]])
		.optional(),
});

type UpdateInterestBody = z.infer<typeof UpdateInterestSchema>;

export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const profile = await prisma.profile.findFirst({
		where: { userId: currentUser.id },
		select: {
			id: true,
			primaryInterest: true,
			preferredGenres: true,
			preferredLevels: true,
			preferredSettings: true,
		},
	});

	return json(profile);
});

export const PUT = withAuth({ mode: "user" })(
	withValidation(UpdateInterestSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const {
			preferredGenres,
			preferredLevels,
			preferredSettings,
			primaryInterest,
		} = body as UpdateInterestBody;

		// `primaryInterest` is a wish, not a role: it says what the person would
		// like to do here, and the only thing that reads it is the first screen
		// and the matching job. What they may do comes from their membership.
		await prisma.profile.update({
			where: { userId: currentUser.id },
			data: {
				preferredGenres: preferredGenres
					? {
							set: preferredGenres?.map((v: string) => ({ id: v })),
						}
					: undefined,
				preferredLevels: preferredLevels
					? { set: preferredLevels?.map((v: string) => ({ id: v })) }
					: undefined,
				preferredSettings: preferredSettings
					? { set: preferredSettings?.map((v: string) => ({ id: v })) }
					: undefined,
				primaryInterest: primaryInterest as PrimaryInterest | undefined,
			},
		});

		return json({ ok: true });
	}),
);
