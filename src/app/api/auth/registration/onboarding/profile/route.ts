import { z } from "zod";
import { defaultLocale, isAvailableLocale } from "@/config/locale";
import {
	apiError,
	json,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

const SaveOnboardingProfileSchema = z.object({
	name: z.string().optional(),
	yearOfBirth: z.number().optional(),
	country: z.string().optional(),
	city: z.string().optional(),
	confirmUserData: z.boolean().optional(),
	agreeWithTermsAndPrivacy: z.boolean().optional(),
	needSubscribeToNewsletter: z.boolean().optional(),
});

type SaveOnboardingProfileBody = z.infer<typeof SaveOnboardingProfileSchema>;

function detectLocale(req: Request) {
	let locale = defaultLocale;
	const acceptLanguage = req.headers.get("accept-language");

	if (acceptLanguage) {
		const [availabeLocales] = acceptLanguage.split(";");
		const fullLocale = availabeLocales?.split(",")[1];
		const shortLocale = fullLocale?.split("-")[0];

		if (isAvailableLocale(shortLocale)) {
			locale = shortLocale;
		}
	}

	return locale;
}

export const GET = withAuth({ mode: "user" })(async (_req, _ctx, { user }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();

	const profile = await prisma.profile.findFirst({
		where: { user: { id: currentUser.id } },
		include: { user: { select: { id: true, agreements: true } } },
	});

	return json(profile);
});

export const PUT = withAuth({ mode: "user" })(
	withValidation(SaveOnboardingProfileSchema)(
		async (req, _ctx, { user, body }) => {
			const currentUser = user as SessionUser | undefined;
			if (!currentUser) return apiError.unauthorized();

			try {
				const locale = detectLocale(req);
				const {
					name,
					yearOfBirth,
					country,
					city,
					confirmUserData,
					agreeWithTermsAndPrivacy,
					needSubscribeToNewsletter,
				} = body as SaveOnboardingProfileBody;

				const userRecord = await prisma.user.findUnique({
					where: { id: currentUser.id },
					include: { profile: true },
				});

				if (!userRecord) return apiError.badRequest("The user is not exist");

				const agreements: any = userRecord?.agreements || {};

				agreements.confirmUserData = confirmUserData;
				if (agreeWithTermsAndPrivacy)
					agreements.agreeWithTermsAndPrivacy = agreeWithTermsAndPrivacy;
				if (needSubscribeToNewsletter)
					agreements.needSubscribeToNewsletter = needSubscribeToNewsletter;

				if (userRecord?.profile) {
					await prisma.profile.update({
						where: { userId: currentUser.id },
						data: {
							name,
							city,
							yearOfBirth,
							country,
							user: { update: { agreements, lang: locale } },
						},
					});
				} else {
					await prisma.profile.create({
						data: {
							name: name as string,
							city,
							yearOfBirth,
							country,
							user: { connect: { id: userRecord.id } },
						},
					});
				}

				await prisma.user.update({
					where: { id: userRecord.id },
					data: { agreements },
				});

				return json(undefined);
			} catch (error) {
				console.error("saveOnboardingProfile: error", error);
				return apiError.badRequest("Failed to save onboarding profile");
			}
		},
	),
);
