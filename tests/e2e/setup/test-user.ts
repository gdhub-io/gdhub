import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { prisma } from "../../../src/services/prisma";

export const TEST_USER_EMAIL =
	process.env.E2E_TEST_USER_EMAIL ?? "e2e-test@gdhub.local";

/**
 * Ensures a clean, fully-onboarded test user exists in the DB that the
 * e2e-credentials provider can sign in as. Idempotent.
 *
 * Requires the test DB to already be seeded with at least one WorkDirection
 * (run `bun run db:seed --env-file .env.test` once before).
 *
 * - `matrixUserId` is set to a stub so the JWT callback in src/auth.ts skips
 *   `ensureMatrixUser()` (no Matrix server needed for tests).
 * - `roles` includes Author so the project-create flow doesn't trigger the
 *   role-upgrade path.
 * - At least one Speciality is attached: the POST /api/user/project handler
 *   reads `userRecord.specialities[0]` when creating the implicit team.
 */
export async function ensureTestUser() {
	const direction = await prisma.workDirection.findFirst();
	if (!direction) {
		throw new Error(
			"No WorkDirection rows in the test DB. Seed the base data first " +
				"(`bun run db:seed --env-file .env.test`).",
		);
	}

	const user = await prisma.user.upsert({
		where: { email: TEST_USER_EMAIL },
		create: {
			email: TEST_USER_EMAIL,
			name: "E2E Test User",
			emailVerified: new Date(),
			matrixUserId: "@e2e-test:matrix.local",
			onboardingDone: true,
			roles: [prismaClient.UserRole.Author, prismaClient.UserRole.Member],
		},
		update: {
			matrixUserId: "@e2e-test:matrix.local",
			onboardingDone: true,
			roles: { set: [prismaClient.UserRole.Author, prismaClient.UserRole.Member] },
		},
	});

	const existingSpeciality = await prisma.speciality.findFirst({
		where: { userId: user.id },
	});
	if (!existingSpeciality) {
		await prisma.speciality.create({
			data: {
				name: "E2E Test Speciality",
				specialization: "E2E Test Specialization",
				level: prismaClient.SkillLevel.Skillful,
				user: { connect: { id: user.id } },
				direction: { connect: { id: direction.id } },
			} as never,
		});
	}

	return user;
}

/**
 * Hard-deletes any leftover projects this test user might have created.
 * Useful as a guard in case a previous test run died mid-flow.
 */
export async function cleanupTestUserProjects() {
	const user = await prisma.user.findUnique({
		where: { email: TEST_USER_EMAIL },
		include: {
			memberInTeams: {
				where: { status: prismaClient.TeamMemberStatus.Founder },
				select: { team: { select: { project: { select: { id: true } } } } },
			},
		},
	});
	if (!user) return;

	const projectIds = user.memberInTeams
		.map((m) => m.team.project?.id)
		.filter((id): id is string => Boolean(id));

	// Best-effort cleanup. Project has plenty of relations (ProjectEquity etc.)
	// that the app's own lifecycle handler cascades through; from Prisma alone
	// FK violations are expected. If cascade fails, mark the project Archived
	// so it stops showing up in the test user's UI.
	for (const id of projectIds) {
		try {
			await prisma.project.delete({ where: { id } });
		} catch {
			await prisma.project
				.update({
					where: { id },
					data: { status: prismaClient.ProjectStatus.Archived },
				})
				.catch(() => undefined);
		}
	}
}
