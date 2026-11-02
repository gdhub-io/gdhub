import { ProjectStatus, SkillLevel, TeamMemberStatus, UserRole } from "@gdhub-io/gdhub-prisma";
import { prisma } from "../../../src/services/prisma";
import { acceptTermsOfUse } from "./legal";

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
			roles: [UserRole.Author, UserRole.Member],
		},
		update: {
			matrixUserId: "@e2e-test:matrix.local",
			onboardingDone: true,
			roles: { set: [UserRole.Author, UserRole.Member] },
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
 * Hard-deletes any leftover projects this test user might have created.
 * Useful as a guard in case a previous test run died mid-flow.
 */
export async function cleanupTestUserProjects() {
	const user = await prisma.user.findUnique({
		where: { email: TEST_USER_EMAIL },
		include: {
			memberInTeams: {
				where: { status: TeamMemberStatus.Founder },
				select: { team: { select: { project: { select: { id: true } } } } },
			},
		},
	});
	if (!user) return;

	const projectIds = user.memberInTeams
		.map((m) => m.team.project?.id)
		.filter((id): id is string => Boolean(id));

	// `deleteProject` is the package extension the app itself uses — it clears
	// ProjectEquity and the other relations first. A plain `project.delete()`
	// always tripped `ProjectEquity_projectId_fkey`, so every run fell through to
	// the archive branch and left orphans piling up in the test database.
	// Archiving stays as the fallback, so a new relation can't break setup.
	for (const id of projectIds) {
		try {
			await prisma.project.deleteProject({
				projectId: id,
				authorId: user.id,
			});
		} catch {
			await prisma.project
				.update({
					where: { id },
					data: { status: ProjectStatus.Archived },
				})
				.catch(() => undefined);
		}
	}
}
