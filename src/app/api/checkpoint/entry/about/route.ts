import { PrimaryInterest, SkillLevel } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { CHECKPOINT_EXPERIENCE_MAX } from "@/config/checkpoint";
import { SpaceRole } from "@/config/permissions/roles";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { underCheckpointAge } from "@/lib/checkpoint-age";
import {
	LegalAcceptancesSchema,
	LegalError,
	resolveLegal,
} from "@/lib/legal/accept";
import { legalErrorResponse, requestMeta } from "@/lib/legal/http";
import { limitAiCalls } from "@/lib/rate-limit";
import {
	latestAcceptance,
	needsAcceptance,
} from "@/repositories/legal.repository";
import { joinSpace } from "@/services/access/membership";
import { aiValidation } from "@/services/ai-validation";
import { syncUserToBrevo } from "@/services/brevo/sync";
import { prisma } from "@/services/prisma";

const EntryAboutSchema = z.object({
	name: z.string().trim().min(1).max(100),
	yearOfBirth: z.number().int(),
	/** IANA zone, prefilled from the browser; call reminders are written in it. */
	timezone: z
		.string()
		.refine((zone) => Intl.supportedValuesOf("timeZone").includes(zone)),
	/** The user's speciality being edited; absent when they have none yet. */
	specialityId: z.string().min(1).optional(),
	specialityName: z.string().trim().min(1).max(100),
	workDirectionId: z.string().min(1),
	level: z.nativeEnum(SkillLevel),
	/** "Briefly about your experience" — kept on the speciality, shown in the curator's brief. */
	experience: z.string().trim().max(CHECKPOINT_EXPERIENCE_MAX).optional(),
	/** The Terms of Use, from this form or the registration page; needed until accepted. */
	legal: LegalAcceptancesSchema.optional(),
	needSubscribeToNewsletter: z.boolean().optional(),
});

type EntryAboutBody = z.infer<typeof EntryAboutSchema>;

/**
 * Item 1 of the checkpoint entry: the profile and speciality steps of onboarding
 * in one request, which also finishes onboarding — the author came to head for a
 * checkpoint, so a first profile gets the interest `Author` and the resources
 * step is skipped. An interest already chosen is left alone.
 *
 * Onboarding is never finished without the Terms of Use accepted: a user who
 * arrived without that acceptance must tick it here.
 *
 * The client re-reads the JWT afterwards (`resyncSession`), as the last
 * onboarding step does: the proxy gates `/user/**` on `onboardingDone` in it.
 */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withValidation(EntryAboutSchema),
)(async (req, _ctx, { user, body }) => {
	const currentUser = user as SessionUser | undefined;
	if (!currentUser) return apiError.unauthorized();
	const input = body as EntryAboutBody;

	const [userRecord, direction, speciality] = await Promise.all([
		prisma.user.findUnique({
			where: { id: currentUser.id },
			select: { onboardingDone: true, agreements: true },
		}),
		prisma.workDirection.findUnique({
			where: { id: input.workDirectionId },
			select: { id: true },
		}),
		input.specialityId
			? prisma.speciality.findFirst({
					where: { id: input.specialityId, userId: currentUser.id },
					select: { id: true },
				})
			: null,
	]);

	if (!userRecord) return apiError.notFound("User not found");
	if (!direction) return apiError.badRequest("Unknown work direction");
	if (input.specialityId && !speciality) {
		return apiError.notFound("Speciality not found");
	}
	if (underCheckpointAge(input.yearOfBirth)) {
		return apiError.badRequest("underage");
	}

	let acceptances: ReturnType<typeof resolveLegal> = [];
	if (
		needsAcceptance(
			"TermsOfUse",
			(await latestAcceptance(currentUser.id, "TermsOfUse"))?.version,
		)
	) {
		try {
			acceptances = resolveLegal(input.legal, ["TermsOfUse"], {
				userId: currentUser.id,
				context: "SignUp",
				meta: requestMeta(req),
			});
		} catch (error) {
			if (error instanceof LegalError) return legalErrorResponse(error);
			throw error;
		}
	}

	const limited = await limitAiCalls("entry-about", currentUser.id);
	if (limited) return limited;

	const validation = await aiValidation.validate(
		[
			{ key: "name", label: "Name", value: input.name, kind: "person_name" },
			{
				key: "specialityName",
				label: "Speciality",
				value: input.specialityName,
				kind: "speciality",
			},
			...(input.experience
				? [
						{
							key: "experience",
							label: "Experience",
							value: input.experience,
							kind: "specialization" as const,
						},
					]
				: []),
		],
		{ locale: currentUser.lang },
	);
	if (!validation.ok) {
		return json(
			{ error: "Validation failed", statusCode: 400, validation },
			{ status: 400 },
		);
	}

	const agreements = {
		...((userRecord.agreements ?? {}) as Record<string, unknown>),
		...(input.needSubscribeToNewsletter === undefined
			? null
			: { needSubscribeToNewsletter: input.needSubscribeToNewsletter }),
	};

	const specialityData = {
		name: input.specialityName,
		level: input.level,
		workDirectionId: input.workDirectionId,
		specialization: input.experience ?? "",
	};
	const profileData = {
		name: input.name,
		yearOfBirth: input.yearOfBirth,
		timezone: input.timezone,
	};

	await prisma.$transaction(async (tx) => {
		if (acceptances.length) {
			await tx.legalAcceptance.createMany({ data: acceptances });
		}
		await tx.profile.upsert({
			where: { userId: currentUser.id },
			create: {
				userId: currentUser.id,
				...profileData,
				primaryInterest: PrimaryInterest.Author,
			},
			// The column defaults to Specialist, so a profile left half-way through
			// onboarding has no chosen interest yet; a finished one has.
			update: {
				...profileData,
				...(userRecord.onboardingDone
					? null
					: { primaryInterest: PrimaryInterest.Author }),
			},
		});

		// The session reads `User.name`, the profile pages read `Profile.name`.
		await tx.user.update({
			where: { id: currentUser.id },
			data: {
				name: input.name,
				agreements,
				onboardingDone: true,
			},
		});

		if (speciality) {
			await tx.speciality.update({
				where: { id: speciality.id },
				data: specialityData,
			});
		} else {
			await tx.speciality.create({
				data: { ...specialityData, userId: currentUser.id },
			});
		}
	});

	// Only on the first pass: `joinSpace` sets the role, and a second save must
	// not turn a hub admin back into a member.
	if (!userRecord.onboardingDone) {
		await joinSpace({
			type: "hub",
			userId: currentUser.id,
			role: SpaceRole.Member,
		});

		try {
			await syncUserToBrevo(currentUser.id);
		} catch (error) {
			console.error("[brevo: checkpoint entry]", error);
		}
	}

	return json({ ok: true, validation });
});
