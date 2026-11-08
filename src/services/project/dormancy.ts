import { ProjectStatus } from "@gdhub-io/gdhub-prisma";
import {
	ARCHIVE_AFTER_DORMANT_DAYS,
	statusChangeData,
} from "@/lib/project-status";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

type SleepingProject = {
	id: string;
	name: string;
	slug: string;
	authorId: string;
	author: { email: string | null };
};

/** Moves an Approved project to Dormant and tells its author. */
export async function putToSleep(project: SleepingProject, now: Date) {
	await prisma.project.update({
		where: { id: project.id, status: ProjectStatus.Approved },
		data: statusChangeData(ProjectStatus.Dormant, now),
	});

	try {
		await NovuService.send({
			template: "default-message",
			to: {
				subscriberId: project.authorId,
				email: project.author.email || undefined,
			},
			payload: {
				title: "Project status changed to Dormant",
				message:
					`Your project "${project.name}" was moved to Dormant due to inactivity. ` +
					"To restore activity, publish a devlog or make other project updates. " +
					`If there is no activity in the next ${ARCHIVE_AFTER_DORMANT_DAYS} days, the project will be archived.`,
				redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/user/project/${project.slug}`,
			},
		});
	} catch (error) {
		console.error(
			`Failed to send Dormant notification for project ${project.id}`,
			error,
		);
	}
}
