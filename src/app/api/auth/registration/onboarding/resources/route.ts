import { z } from "zod";
import { SpaceRole } from "@/config/permissions/roles";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { joinSpace } from "@/services/access/membership";
import { brevoApi } from "@/services/brevo";
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

		const profile = await prisma.profile.update({
			where: { userId: currentUser.id },
			data: {
				timeForWork: timeForWork ?? undefined,
				otherResources: otherResources ?? undefined,
				isActive: isActive ?? undefined,
				user: { update: { onboardingDone: true } },
			},
			select: {
				primaryInterest: true,
				name: true,
				user: {
					select: { agreements: true, name: true, email: true, lang: true },
				},
			},
		});

		// Finishing onboarding is what turns a hub guest into a hub member. Until
		// now the adapter derived that from `onboardingDone` on every request;
		// writing it down is what lets that bridge go away.
		await joinSpace({
			type: "hub",
			userId: currentUser.id,
			role: SpaceRole.Member,
		});

		try {
			const agreements = profile.user.agreements as Record<string, boolean>;

			const response = await brevoApi.contacts.createContact({
				email: profile.user.email as string,
				listIds: [2],
				attributes: {
					MAIN_LOCALE: profile.user.lang,
					MAIN_INTEREST: profile.primaryInterest,
					FIRSTNAME: profile.name || profile.user.name,
					HAS_SUBSCRIBE_TO_NEWSLETTER:
						agreements?.needSubscribeToNewsletter || false,
				},
			});

			console.log("[brevo: newSubscriber: response]", response);
		} catch (error) {
			console.error("[brevo: newSubscriber: error]", error);
		}

		return json({ ok: true });
	}),
);
