/**
 * One-off repair for GDHUB-167: puts back to sleep the projects the status cron
 * woke up because a page view or its own write looked like activity.
 *
 *   bun run project:dormancy-repair:prod              # report only
 *   bun run project:dormancy-repair:prod -- --apply   # move them to Dormant
 *
 * A project counts when the cron reactivated it since the 2026-10-09 change, it
 * is still Approved, and nothing but that reactivation happened to it within
 * the dormant threshold. Applying moves it to Dormant and mails the author, the
 * same as the cron does; the cron archives it after the usual grace period.
 */
import { ProjectStatus, QueueJobStatus } from "@gdhub-io/gdhub-prisma";
import { lastActivity } from "@/lib/activity";
import { shouldGoDormant } from "@/lib/project-status";
import { PROJECT_ACTIVITY } from "@/repositories/project/activity";
import { prisma } from "@/services/prisma";
import { isProjectAvailableOnStores } from "@/services/prisma/queries";
import {
	IDLE_PROJECT_SELECT,
	IDLE_PROJECT_WHERE,
	putToSleep,
} from "@/services/project/dormancy";
import { announceDbTarget } from "./_db-target";

const REACTIVATING_SINCE = new Date("2026-10-09T00:00:00Z");

async function main() {
	const apply = process.argv.includes("--apply");
	announceDbTarget(apply ? "Moving projects to Dormant in" : "Reading");

	const runs = await prisma.queueJobLog.findMany({
		where: {
			name: "project-status-maintenance",
			status: QueueJobStatus.Completed,
			createdAt: { gte: REACTIVATING_SINCE },
		},
		select: { data: true },
	});
	const woken = [
		...new Set(
			runs.flatMap(
				(run) =>
					(run.data as { reactivatedProjectIds?: string[] } | null)
						?.reactivatedProjectIds ?? [],
			),
		),
	];

	const projects = await prisma.project.findMany({
		where: {
			...IDLE_PROJECT_WHERE,
			id: { in: woken },
			status: ProjectStatus.Approved,
		},
		select: IDLE_PROJECT_SELECT,
	});

	// The reactivation itself is the one status change that must not count.
	const latest = await lastActivity(
		{ ...PROJECT_ACTIVITY, statusChanged: async () => [] },
		projects.map((project) => project.id),
	);
	const now = new Date();
	const idle = projects.filter((project) => {
		const at = latest.get(project.id);
		return (
			at &&
			shouldGoDormant({
				lastActivityAt: at,
				onStores: isProjectAvailableOnStores(project),
				now,
			})
		);
	});

	console.info(
		`Reactivated by the cron: ${woken.length}, still Approved: ${projects.length}, idle: ${idle.length}`,
	);
	for (const project of idle) {
		console.info(
			`  ${project.slug}  last activity ${latest.get(project.id)?.toISOString().slice(0, 10)}`,
		);
	}

	if (!apply) {
		console.info("\nReport only. Run again with --apply to move them to Dormant.");
		return;
	}
	for (const project of idle) await putToSleep(project, now);
	console.info(`\nMoved ${idle.length} projects to Dormant.`);
}

main()
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
