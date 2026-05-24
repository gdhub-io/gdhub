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
	name: z.string().nullish(),
	yearOfBirth: z.number().nullish(),
	country: z.string().nullish(),
	city: z.string().nullish(),
	confirmUserData: z.boolean().nullish(),
	agreeWithTermsAndPrivacy: z.boolean().nullish(),
	needSubscribeToNewsletter: z.boolean().nullish(),
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

				// `name` and `yearOfBirth` are non-nullable in Profile — convert
				// form-sent nulls to `undefined` so Prisma skips them on update
				// instead of failing. `city`/`country` are nullable, leave as-is.
				const safeName = name ?? undefined;
				const safeYearOfBirth = yearOfBirth ?? undefined;

				// Prisma rejects `undefined` inside Json columns with
				// "Value is not JSON serializable". Build a plain object and
				// strip nulls/undefineds via JSON round-trip before writing.
				const existing = (userRecord.agreements ?? {}) as Record<
					string,
					unknown
				>;
				const agreementsPayload: Record<string, unknown> = { ...existing };
				if (confirmUserData != null)
					agreementsPayload.confirmUserData = confirmUserData;
				if (agreeWithTermsAndPrivacy != null)
					agreementsPayload.agreeWithTermsAndPrivacy = agreeWithTermsAndPrivacy;
				if (needSubscribeToNewsletter != null)
					agreementsPayload.needSubscribeToNewsletter =
						needSubscribeToNewsletter;
				const agreements = JSON.parse(JSON.stringify(agreementsPayload));

				if (userRecord.profile) {
					await prisma.profile.update({
						where: { userId: currentUser.id },
						data: {
							name: safeName,
							city,
							yearOfBirth: safeYearOfBirth,
							country,
						},
					});
				} else {
					if (!safeName) {
						return apiError.badRequest("Name is required");
					}
					await prisma.profile.create({
						data: {
							name: safeName,
							city: city ?? undefined,
							yearOfBirth: safeYearOfBirth,
							country: country ?? undefined,
							user: { connect: { id: userRecord.id } },
						},
					});
				}

				await prisma.user.update({
					where: { id: userRecord.id },
					data: { agreements, lang: locale },
				});

				return json({ ok: true });
			} catch (error) {
				console.error("saveOnboardingProfile: error", error);
				const details =
					process.env.NODE_ENV !== "production"
						? (error as Error)?.message
						: undefined;
				return apiError.badRequest(
					"Failed to save onboarding profile",
					details,
				);
			}
		},
	),
);
