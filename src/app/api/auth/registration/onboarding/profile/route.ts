import { z } from "zod";
import { defaultLocale, isAvailableLocale } from "@/config/locale";
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
import { aiValidation } from "@/services/ai-validation";
import { prisma } from "@/services/prisma";

const SaveOnboardingProfileSchema = z.object({
	name: z.string().nullish(),
	yearOfBirth: z.number().nullish(),
	country: z.string().nullish(),
	city: z.string().nullish(),
	confirmUserData: z.boolean().nullish(),
	needSubscribeToNewsletter: z.boolean().nullish(),
	/** The Terms box ticked at registration, carried here in a cookie: the account exists only now. */
	legal: LegalAcceptancesSchema.optional(),
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
					needSubscribeToNewsletter,
					legal,
				} = body as SaveOnboardingProfileBody;

				const userRecord = await prisma.user.findUnique({
					where: { id: currentUser.id },
					include: { profile: true },
				});

				if (!userRecord) return apiError.badRequest("The user is not exist");

				// AI checks: no offensive/forbidden content, and the name field
				// actually looks like a name (advisory warning, does not block).
				const validation = await aiValidation.validate(
					[
						{
							key: "name",
							label: "Name",
							value: name ?? "",
							kind: "person_name",
						},
					],
					{ locale },
				);
				if (!validation.ok) {
					return json(
						{ error: "Validation failed", statusCode: 400, validation },
						{ status: 400 },
					);
				}

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
				if (needSubscribeToNewsletter != null)
					agreementsPayload.needSubscribeToNewsletter =
						needSubscribeToNewsletter;
				const agreements = JSON.parse(JSON.stringify(agreementsPayload));

				if (!userRecord.profile && !safeName) {
					return apiError.badRequest("Name is required");
				}

				await prisma.$transaction(async (tx) => {
					if (userRecord.profile) {
						await tx.profile.update({
							where: { userId: currentUser.id },
							data: {
								name: safeName,
								city,
								yearOfBirth: safeYearOfBirth,
								country,
							},
						});
					} else {
						await tx.profile.create({
							data: {
								name: safeName as string,
								city: city ?? undefined,
								yearOfBirth: safeYearOfBirth,
								country: country ?? undefined,
								user: { connect: { id: userRecord.id } },
							},
						});
					}

					await tx.user.update({
						where: { id: userRecord.id },
						data: { agreements, lang: locale },
					});

					// Without a tick here (an account made from the sign-in page) the
					// re-acceptance screen asks for the Terms at the next sign-in instead.
					if (legal?.length) {
						await acceptLegal(tx, legal, ["TermsOfUse"], {
							userId: userRecord.id,
							context: "SignUp",
							meta: requestMeta(req),
						});
					}
				});

				return json({ ok: true, validation });
			} catch (error) {
				if (error instanceof LegalError) return legalErrorResponse(error);
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
