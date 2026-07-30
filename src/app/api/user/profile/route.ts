import {
	type Language,
	PrimaryInterest,
	UserRole,
} from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { AvailableLocales } from "@/config/locale";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
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
			...othersProfileData
		} = data;

		let profile = await prisma.profile.findUnique({
			where: { userId: currentUser.id! },
			include: { user: true },
		});
		let updatedRoles = (profile?.user.roles as UserRole[]) || [];

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

		// on  onboarding
		if (onboardingDone) {
			updatedRoles = [UserRole.Member];
		}
		// on  save profile
		if (primaryInterest && primaryInterest === PrimaryInterest.Specialist) {
			const idxMentor = updatedRoles.findIndex((v) => v === UserRole.Mentor);
			const idxAuthor = updatedRoles.findIndex((v) => v === UserRole.Author);

			if (idxMentor !== -1) {
				updatedRoles.splice(idxMentor, 1);
			}
			if (idxAuthor !== -1) {
				updatedRoles.splice(idxAuthor, 1);
			}
		}
		if (
			primaryInterest &&
			primaryInterest === PrimaryInterest.Author &&
			!updatedRoles.includes(UserRole.Author)
		) {
			const idx = updatedRoles.findIndex((v) => v === UserRole.Mentor);

			if (idx !== -1) {
				updatedRoles.splice(idx, 1);
			}
			updatedRoles.push(UserRole.Author);
		}
		if (
			primaryInterest &&
			primaryInterest === PrimaryInterest.Mentor &&
			!updatedRoles.includes(UserRole.Mentor)
		) {
			const idx = updatedRoles.findIndex((v) => v === UserRole.Author);

			if (idx !== -1) {
				updatedRoles.splice(idx, 1);
			}

			updatedRoles.push(UserRole.Mentor);
		}

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
						roles: updatedRoles,
						agreements: agreementsChanged ? agreements : undefined,
					},
				},
			},
		});

		return json({ success: true });
	}),
);
