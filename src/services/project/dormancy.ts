import { type Prisma, ProjectStatus } from "@gdhub-io/gdhub-prisma";
import {
	ARCHIVE_AFTER_DORMANT_DAYS,
	statusChangeData,
} from "@/lib/project-status";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

type IdleProject = {
	id: string;
	name: string;
	slug: string;
	authorId: string;
	author: { email: string | null };
};

/** Projects the status cron looks after: unfinished, with an author still on the platform. */
export const IDLE_PROJECT_WHERE = {
	finishedAt: null,
	author: { profile: { isActive: true } },
} satisfies Prisma.ProjectWhereInput;

/** What the cron reads of a project to decide and to tell the author. */
export const IDLE_PROJECT_SELECT = {
	id: true,
	name: true,
	slug: true,
	authorId: true,
	links: true,
	author: { select: { email: true } },
	workflow: { select: { currentStep: { select: { order: true } } } },
} satisfies Prisma.ProjectSelect;

const tellAuthor = async (
	project: IdleProject,
	title: string,
	message: string,
) => {
	try {
		await NovuService.send({
			template: "default-message",
			to: {
				subscriberId: project.authorId,
				email: project.author.email || undefined,
			},
			payload: {
				title,
				message,
				redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/user/project/${project.slug}`,
			},
		});
	} catch (error) {
		console.error(`Failed to send "${title}" for project ${project.id}`, error);
	}
};

/** Moves `project` from `from` to `to`; the `where` refuses it if someone moved it first. */
const move = (
	project: IdleProject,
	from: ProjectStatus,
	to: ProjectStatus,
	now: Date,
) =>
	prisma.project.update({
		where: { id: project.id, status: from },
		data: statusChangeData(to, now),
	});

export async function putToSleep(project: IdleProject, now: Date) {
	await move(project, ProjectStatus.Approved, ProjectStatus.Dormant, now);
	await tellAuthor(
		project,
		"Project status changed to Dormant",
		`Your project "${project.name}" was moved to Dormant due to inactivity. ` +
			"To restore activity, publish a devlog or make other project updates. " +
			`If there is no activity in the next ${ARCHIVE_AFTER_DORMANT_DAYS} days, the project will be archived.`,
	);
}

export const wake = (project: IdleProject, now: Date) =>
	move(project, ProjectStatus.Dormant, ProjectStatus.Approved, now);

export async function archive(project: IdleProject, now: Date) {
	await move(project, ProjectStatus.Dormant, ProjectStatus.Archived, now);
	await tellAuthor(
		project,
		"Project status changed to Archived",
		`Your project "${project.name}" was moved to Archived because there was no activity during the Dormant period.`,
	);
}
