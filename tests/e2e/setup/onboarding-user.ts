import { prisma } from "../../../src/services/prisma";

export const ONBOARDING_USER_EMAIL =
	process.env.E2E_ONBOARDING_USER_EMAIL ?? "e2e-onboarding@gdhub.local";

/**
 * Creates a fresh user with `onboardingDone: false` and no profile/speciality.
 * The proxy middleware will redirect this user to `/registration/onboarding`.
 */
export async function ensureOnboardingUser() {
	await cleanupOnboardingUser();

	return prisma.user.create({
		data: {
			email: ONBOARDING_USER_EMAIL,
			name: null,
			emailVerified: new Date(),
			matrixUserId: "@e2e-onboarding:matrix.local",
			onboardingDone: false,
			roles: [],
		},
	});
}

/**
 * Removes the onboarding test user and all related data.
 */
export async function cleanupOnboardingUser() {
	const user = await prisma.user.findUnique({
		where: { email: ONBOARDING_USER_EMAIL },
	});
	if (!user) return;

	await prisma.speciality
		.deleteMany({ where: { userId: user.id } })
		.catch(() => undefined);
	await prisma.profile
		.deleteMany({ where: { userId: user.id } })
		.catch(() => undefined);
	await prisma.account
		.deleteMany({ where: { userId: user.id } })
		.catch(() => undefined);
	await prisma.session
		.deleteMany({ where: { userId: user.id } })
		.catch(() => undefined);
	await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
}
