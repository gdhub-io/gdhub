/**
 * Moves the existing users into `SpaceMember`.
 *
 *   bun run rbac:backfill -- --dry-run   # report only
 *   bun run rbac:backfill                # apply
 *
 * Idempotent: memberships are upserted, so a second run changes nothing. The
 * merge decisions live in `mergeMemberships` and are unit-tested; this file only
 * queries and writes.
 *
 * `isSuperAdmin` is never set here — that is a manual decision for one or two
 * people (docs/roles-and-permissions.md §2.1).
 */
import {
	CourseStudentStatus,
	EventMemberStatus,
	TeamMemberStatus,
	UserRole,
} from "@gdhub-io/gdhub-prisma";
import { SpaceRole } from "@/config/permissions/roles";
import {
	type Candidate,
	HUB_ROLE,
	mergeMemberships,
} from "@/services/access/backfill";
import { joinSpace } from "@/services/access/membership";
import { DEFAULT_SPACE_ID } from "@/services/access/types";
import { prisma } from "@/services/prisma";

async function collect(): Promise<Candidate[]> {
	const candidates: Candidate[] = [];

	const users = await prisma.user.findMany({
		select: { id: true, onboardingDone: true, roles: true },
	});

	for (const user of users) {
		candidates.push({
			type: "hub",
			spaceId: DEFAULT_SPACE_ID,
			userId: user.id,
			role: HUB_ROLE(user.onboardingDone),
			source: "user.onboardingDone",
		});

		// Platform staff. This is the access to the admin space, not to anyone's
		// project — that line is only crossed by the super-admin.
		if (user.roles.includes(UserRole.Admin)) {
			candidates.push({
				type: "hub",
				spaceId: DEFAULT_SPACE_ID,
				userId: user.id,
				role: SpaceRole.Admin,
				source: "user.roles=Admin",
			});
		}
	}

	const projects = await prisma.project.findMany({
		select: { id: true, authorId: true },
	});

	for (const project of projects) {
		candidates.push({
			type: "project",
			spaceId: project.id,
			userId: project.authorId,
			role: SpaceRole.Owner,
			source: "project.authorId",
		});
	}

	const teamMembers = await prisma.teamMember.findMany({
		where: {
			status: { in: [TeamMemberStatus.Founder, TeamMemberStatus.Hired] },
			team: { projectId: { not: null } },
		},
		select: {
			userId: true,
			status: true,
			team: { select: { projectId: true } },
		},
	});

	for (const member of teamMembers) {
		if (!member.team.projectId) continue;

		candidates.push({
			type: "project",
			spaceId: member.team.projectId,
			userId: member.userId,
			role:
				member.status === TeamMemberStatus.Founder
					? SpaceRole.Owner
					: SpaceRole.Member,
			source: `teamMember.${member.status}`,
		});
	}

	const events = await prisma.event.findMany({
		select: { id: true, createdById: true },
	});

	for (const event of events) {
		candidates.push({
			type: "event",
			spaceId: event.id,
			userId: event.createdById,
			role: SpaceRole.Owner,
			source: "event.createdById",
		});
	}

	const eventMembers = await prisma.eventMember.findMany({
		where: { status: EventMemberStatus.Approved },
		select: { eventId: true, userId: true },
	});

	for (const member of eventMembers) {
		candidates.push({
			type: "event",
			spaceId: member.eventId,
			userId: member.userId,
			role: SpaceRole.Member,
			source: "eventMember.Approved",
		});
	}

	const courses = await prisma.course.findMany({
		select: { id: true, createdById: true },
	});

	for (const course of courses) {
		candidates.push({
			type: "course",
			spaceId: course.id,
			userId: course.createdById,
			role: SpaceRole.Owner,
			source: "course.createdById",
		});
	}

	const students = await prisma.courseGroupStudent.findMany({
		where: {
			status: {
				in: [CourseStudentStatus.Enrolled, CourseStudentStatus.Finished],
			},
		},
		select: { userId: true, group: { select: { courseId: true } } },
	});

	for (const student of students) {
		if (!student.group?.courseId) continue;

		candidates.push({
			type: "course",
			spaceId: student.group.courseId,
			userId: student.userId,
			role: SpaceRole.Member,
			source: "courseGroupStudent",
		});
	}

	return candidates;
}

async function main() {
	const dryRun = process.argv.includes("--dry-run");

	const candidates = await collect();
	const memberships = mergeMemberships(candidates);

	const byType = new Map<string, number>();
	const conflicts = memberships.filter((row) => row.sources.length > 1);

	for (const row of memberships) {
		byType.set(row.type, (byType.get(row.type) ?? 0) + 1);
	}

	if (!dryRun) {
		for (const row of memberships) {
			await joinSpace({
				type: row.type,
				spaceId: row.spaceId,
				userId: row.userId,
				role: row.role,
			});
		}
	}

	console.info(`\nRBAC backfill${dryRun ? " — dry run" : ""}:`);
	console.info(`  candidates      : ${candidates.length}`);
	console.info(`  memberships     : ${memberships.length}`);

	for (const [type, count] of [...byType].sort()) {
		console.info(`    ${type.padEnd(8)}: ${count}`);
	}

	console.info(`  merged conflicts: ${conflicts.length}`);

	// Worth reading before a real run: these are the users a query would have
	// given a different role depending on which table was read first.
	for (const row of conflicts.slice(0, 20)) {
		console.info(
			`    ${row.type}:${row.spaceId} ${row.userId} → ${row.role} (${row.sources.join(", ")})`,
		);
	}

	if (conflicts.length > 20) {
		console.info(`    … and ${conflicts.length - 20} more`);
	}

	console.info(
		"\nisSuperAdmin is not set by this script — do it by hand for the one or two people who need it.",
	);
}

main()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
