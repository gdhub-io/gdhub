import { PrimaryInterest, SkillLevel } from "@gdhub-io/gdhub-prisma";
import { z } from "zod";
import { SpaceRole } from "@/config/permissions/roles";
import {
	apiError,
	json,
	pipe,
	type SessionUser,
	withAuth,
	withValidation,
} from "@/lib/api-handlers";
import { limitAiCalls } from "@/lib/rate-limit";
import { termsAccepted } from "@/repositories/checkpoint-entry";
import { joinSpace } from "@/services/access/membership";
import { aiValidation } from "@/services/ai-validation";
import { syncUserToBrevo } from "@/services/brevo/sync";
import { prisma } from "@/services/prisma";

const EntryAboutSchema = z.object({
	name: z.string().trim().min(1).max(100),
	country: z.string().trim().min(1),
	/** The user's speciality being edited; absent when they have none yet. */
	specialityId: z.string().min(1).optional(),
	specialityName: z.string().trim().min(1).max(100),
	workDirectionId: z.string().min(1),
	level: z.nativeEnum(SkillLevel),
	/** An uploaded avatar URL; null removes it, absent leaves it as it is. */
	image: z.string().url().nullish(),
	agreeWithTermsAndPrivacy: z.boolean().optional(),
	needSubscribeToNewsletter: z.boolean().optional(),
});

type EntryAboutBody = z.infer<typeof EntryAboutSchema>;

/**
 * Item 1 of the checkpoint entry: the profile and speciality steps of onboarding
 * in one request, which also finishes onboarding — the author came to head for a
 * checkpoint, so a first profile gets the interest `Author` and the resources
 * step is skipped. An interest already chosen is left alone.
 *
 * Onboarding is never finished without a recorded Terms and Privacy agreement:
 * a user who arrived without one must tick it here.
 *
 * The client re-reads the JWT afterwards (`resyncSession`), as the last
 * onboarding step does: the proxy gates `/user/**` on `onboardingDone` in it.
 */
export const POST = pipe(
	withAuth({ mode: "user" }),
	withValidation(EntryAboutSchema),
)(async (_req, _ctx, { user, body }) => {
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
	if (
		!termsAccepted(userRecord.agreements) &&
		input.agreeWithTermsAndPrivacy !== true
	) {
		return apiError.badRequest("termsRequired");
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
		// Recorded once; unticking a box later does not withdraw it here.
		...(input.agreeWithTermsAndPrivacy === true
			? { agreeWithTermsAndPrivacy: true }
			: null),
		...(input.needSubscribeToNewsletter === undefined
			? null
			: { needSubscribeToNewsletter: input.needSubscribeToNewsletter }),
	};

	const specialityData = {
		name: input.specialityName,
		level: input.level,
		workDirectionId: input.workDirectionId,
	};

	await prisma.$transaction(async (tx) => {
		await tx.profile.upsert({
			where: { userId: currentUser.id },
			create: {
				userId: currentUser.id,
				name: input.name,
				country: input.country,
				primaryInterest: PrimaryInterest.Author,
			},
			// The column defaults to Specialist, so a profile left half-way through
			// onboarding has no chosen interest yet; a finished one has.
			update: {
				name: input.name,
				country: input.country,
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
				...(input.image === undefined ? null : { image: input.image }),
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
				data: { ...specialityData, specialization: "", userId: currentUser.id },
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
