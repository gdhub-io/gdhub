import { z } from "zod";
import { SpaceRole } from "@/config/permissions/roles";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { saveAvailability } from "@/repositories/user/availability";
import { joinSpace } from "@/services/access/membership";
import { syncUserToBrevo } from "@/services/brevo/sync";
import { prisma } from "@/services/prisma";

const UpdateResourcesSchema = z.object({
	timeForWork: z.array(z.number()).optional().nullable(),
	otherResources: z.string().optional().nullable(),
	isActive: z.boolean().optional().nullable(),
});

type UpdateResourcesBody = z.infer<typeof UpdateResourcesSchema>;

export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const profile = await prisma.profile.findFirst({
		where: { userId: currentUser.id },
		select: {
			id: true,
			timeForWork: true,
			otherResources: true,
			isActive: true,
		},
	});

	return json(profile);
});

export const PUT = withAuth({ mode: "user" })(
	withValidation(UpdateResourcesSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();

		const { timeForWork, otherResources, isActive } =
			body as UpdateResourcesBody;

		await prisma.profile.update({
			where: { userId: currentUser.id },
			data: {
				otherResources: otherResources ?? undefined,
				user: { update: { onboardingDone: true } },
			},
		});
		await saveAvailability(currentUser.id, {
			timeForWork: timeForWork ?? undefined,
			isActive: isActive ?? undefined,
		});

		// Finishing onboarding is what turns a hub guest into a hub member. Until
		// now the adapter derived that from `onboardingDone` on every request;
		// writing it down is what lets that bridge go away.
		await joinSpace({
			type: "hub",
			userId: currentUser.id,
			role: SpaceRole.Member,
		});

		// The same write the admin sync makes, rather than a second description of
		// what a contact is: this route used to assemble its own attributes, which
		// is how `MAIN_LOCALE` ended up set only for people who signed up while
		// that line existed, and `ONBOARDING_DONE` for nobody at all.
		//
		// It upserts, so somebody who started onboarding, left, and came back days
		// later has their contact updated instead of hitting a 400 nobody saw.
		try {
			const result = await syncUserToBrevo(currentUser.id);

			console.log("[brevo: newSubscriber]", result);
		} catch (error) {
			console.error("[brevo: newSubscriber: error]", error);
		}

		return json({ ok: true });
	}),
);
