import { PrimaryInterest, SkillLevel, UserRole } from "@gdhub-io/gdhub-prisma";
import { prisma } from "../../../src/services/prisma";
import { acceptTermsOfUse } from "./legal";

export const INVITED_USER_EMAIL =
	process.env.E2E_INVITED_USER_EMAIL ?? "e2e-invited@gdhub.local";

/**
 * Creates a fully-onboarded second user that can accept team invitations.
 * Needs at least one speciality so the accept-invite flow doesn't redirect
 * to onboarding or specialities page.
 */
export async function ensureInvitedUser() {
	const direction = await prisma.workDirection.findFirst();
	if (!direction) {
		throw new Error("No WorkDirection rows. Seed the DB first.");
	}

	const user = await prisma.user.upsert({
		where: { email: INVITED_USER_EMAIL },
		create: {
			email: INVITED_USER_EMAIL,
			name: "E2E Invited User",
			emailVerified: new Date(),
			matrixUserId: "@e2e-invited:matrix.local",
			onboardingDone: true,
			roles: [UserRole.Member],
		},
		update: {
			matrixUserId: "@e2e-invited:matrix.local",
			onboardingDone: true,
			roles: { set: [UserRole.Member] },
			pendingTeamInvitations: [],
		},
	});

	await prisma.profile.upsert({
		where: { userId: user.id },
		create: {
			userId: user.id,
			name: "E2E Invited User",
			primaryInterest: PrimaryInterest.Specialist,
		},
		update: {},
	});

	const existingSpeciality = await prisma.speciality.findFirst({
		where: { userId: user.id },
	});
	if (!existingSpeciality) {
		await prisma.speciality.create({
			data: {
				name: "E2E Invited Speciality",
				specialization: "E2E Testing",
				level: SkillLevel.Skillful,
				user: { connect: { id: user.id } },
				direction: { connect: { id: direction.id } },
			} as never,
		});
	}

	await prisma.legalAcceptance.deleteMany({ where: { userId: user.id } });
	await acceptTermsOfUse(user.id);

	return user;
}

/**
 * Removes the invited test user and all related data.
 */
export async function cleanupInvitedUser() {
	const user = await prisma.user.findUnique({
		where: { email: INVITED_USER_EMAIL },
	});
	if (!user) return;

	await prisma.teamMember
		.deleteMany({ where: { userId: user.id } })
		.catch(() => undefined);
	await prisma.teamInvitation
		.deleteMany({ where: { email: INVITED_USER_EMAIL } })
		.catch(() => undefined);
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
