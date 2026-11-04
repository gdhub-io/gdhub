import { type Language, PrimaryInterest } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { AvailableLocales } from "@/config/locale";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { saveAvailability } from "@/repositories/user/availability";
import { syncUserAvailabilityToBrevo } from "@/services/brevo/sync";
import { prisma } from "@/services/prisma";

const UpdateProfileSchema = z.object({
	name: z.string().optional(),
	tgNickname: z.string().nullable().optional(),
	portfolioLink: z.string().nullable().optional(),
	country: z.string().nullable().optional(),
	city: z.string().nullable().optional(),
	createdAt: z.union([z.string(), z.date()]).optional(),
	updatedAt: z.union([z.string(), z.date()]).optional(),
	timeForWork: z.array(z.number()).optional(),
	otherResources: z.string().optional(),
	isActive: z.boolean().optional(),
	primaryInterest: z
		.enum(Object.values(PrimaryInterest) as [string, ...string[]])
		.optional(),
	preferredGenres: z.array(z.string()).optional(),
	preferredLevels: z.array(z.string()).optional(),
	preferredSettings: z.array(z.string()).optional(),
	agreeWithTermsAndPrivacy: z.boolean().optional(),
	needSubscribeToNewsletter: z.boolean().optional(),
	confirmUserData: z.boolean().optional(),
	onboardingDone: z.boolean().optional(),
	lang: z
		.enum(Object.values(AvailableLocales) as [string, ...string[]])
		.optional(),
});

type UpdateProfileBody = z.infer<typeof UpdateProfileSchema>;

export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const profile = await prisma.profile.findFirst({
		where: { userId: currentUser.id },
		include: {
			preferredGenres: true,
			preferredLevels: true,
			preferredSettings: true,
			user: { select: { lang: true, agreements: true } },
		},
	});

	return json(profile);
});

export const PUT = withAuth({ mode: "user" })(
	withValidation(UpdateProfileSchema)(async (_req, _ctx, { user, body }) => {
		const currentUser = user as SessionUser | undefined;
		if (!currentUser) return apiError.unauthorized();
		const data = body as UpdateProfileBody & { tgNickname?: string | null };
		const {
			name,
			onboardingDone,
			confirmUserData,
			agreeWithTermsAndPrivacy,
			needSubscribeToNewsletter,
			preferredGenres,
			preferredLevels,
			preferredSettings,
			primaryInterest,
			lang,
			// Both go through `saveAvailability`, which keeps their history (GDHUB-141).
			timeForWork,
			isActive,
			...othersProfileData
		} = data;

		let profile = await prisma.profile.findUnique({
			where: { userId: currentUser.id! },
			include: { user: true },
		});
		if (!profile) {
			profile = await prisma.profile.create({
				data: { name: name!, userId: currentUser.id! },
				include: { user: true },
			});
		}

		if (data.tgNickname) {
			let telegramUsername = data.tgNickname as string;
			telegramUsername = telegramUsername
				.replace(/@/g, "")
				.replace(/https:\/\/t\.me\//g, "");
			data.tgNickname = telegramUsername;
			othersProfileData.tgNickname = telegramUsername;
		}

		const agreementsChanged =
			confirmUserData || agreeWithTermsAndPrivacy || needSubscribeToNewsletter;
		const agreements = profile.user.agreements as Record<string, any>;
		if (confirmUserData) agreements.confirmUserData = confirmUserData;
		if (agreeWithTermsAndPrivacy)
			agreements.agreeWithTermsAndPrivacy = agreeWithTermsAndPrivacy;
		if (needSubscribeToNewsletter)
			agreements.needSubscribeToNewsletter = needSubscribeToNewsletter;

		// `primaryInterest` used to be mirrored into `User.roles` here. It is a
		// wish, not a role — nothing is derived from it any more.
		await prisma.profile.update({
			where: { userId: currentUser.id },
			data: {
				...othersProfileData,
				name,
				primaryInterest: primaryInterest as PrimaryInterest | undefined,
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
				user: {
					update: {
						lang: lang as Language | undefined,
						onboardingDone,
						agreements: agreementsChanged ? agreements : undefined,
					},
				},
			},
		});

		await saveAvailability(currentUser.id!, { timeForWork, isActive });

		// "Available for offers" is one of the two things Brevo's `AVAILABLE_FOR`
		// is made of, so a segment built on it has to learn about the change now
		// rather than at the next admin sync.
		if (data.isActive !== undefined) {
			await syncUserAvailabilityToBrevo(currentUser.id!);
		}

		return json({ success: true });
	}),
);
