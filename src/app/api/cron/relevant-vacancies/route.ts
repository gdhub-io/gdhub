import {
	type Project,
	TeamMemberStatus,
	type TeamVacancy,
	TeamVacancyStatus,
	type User,
} from "@gdhub-io/gdhub-prisma";
import dayjs from "dayjs";
import {
	ARCHIVE_WARNING_DAYS,
	CANDIDATE_REMINDER_DAYS,
} from "@/config/vacancy";
import { runWithCronLog } from "@/decorators/QueueCronLog";
import { json, withAuth } from "@/lib/api-handlers";
import { closeVacancyChats } from "@/services/chat/vacancy-keys";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";
import {
	candidatesWaiting,
	vacancyArchived,
	vacancyArchiveWarning,
} from "@/services/vacancyExpiryMessages";

const vacancyWithAuthor = {
	include: {
		team: { include: { project: { include: { author: true } } } },
	},
} as const;

type VacancyWithAuthor = TeamVacancy & {
	team?: {
		project?: (Project & { author?: User | null }) | null;
	} | null;
};

const withPendingCandidates = {
	...vacancyWithAuthor.include,
	_count: {
		select: {
			applicants: { where: { status: TeamMemberStatus.Applicant } },
		},
	},
} as const;

type VacancyWithCandidates = VacancyWithAuthor & {
	_count: { applicants: number };
};

async function notifyAuthor(
	vacancy: VacancyWithAuthor,
	payloadFor: (projectName: string) => { title: string; message: string },
) {
	const project = vacancy.team?.project;
	if (!project?.author) return;
	try {
		await NovuService.send({
			template: "default-message",
			to: {
				subscriberId: project.author.id,
				email: project.author.email ?? undefined,
			},
			payload: {
				...payloadFor(project.name),
				buttonText: "Go to open positions",
				redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/user/project/${project.slug}/open-positions`,
			},
		});
	} catch (error) {
		console.error("[cron.relevant-vacancies] notify failed:", error);
	}
}

export const GET = withAuth({ mode: "vercel_cron" })(async () => {
	const result = await runWithCronLog("relevant-vacancies", async () => {
		// Both steps are keyed to the calendar day, not to the moment of the run:
		// a listing is archived the day after its last one and warned
		// ARCHIVE_WARNING_DAYS runs before that, however the cron drifts.
		const today = dayjs().startOf("day");

		// 1) Warn authors whose listing will be archived in ARCHIVE_WARNING_DAYS days.
		const endingSoon = (await prisma.teamVacancy.findMany({
			where: {
				status: TeamVacancyStatus.Published,
				finishedAt: {
					gte: today.add(ARCHIVE_WARNING_DAYS - 1, "day").toDate(),
					lt: today.add(ARCHIVE_WARNING_DAYS, "day").toDate(),
				},
			},
			include: withPendingCandidates,
		})) as VacancyWithCandidates[];

		const expiringSoon = endingSoon.filter(
			(vacancy) =>
				dayjs(vacancy.finishedAt).diff(
					vacancy.publishedAt ?? vacancy.createdAt,
					"day",
					true,
				) > ARCHIVE_WARNING_DAYS,
		);

		for (const vacancy of expiringSoon) {
			await notifyAuthor(vacancy, (projectName) =>
				vacancyArchiveWarning(
					vacancy.title,
					projectName,
					vacancy._count.applicants,
				),
			);
		}

		// 2) Remind authors of candidates left undecided for CANDIDATE_REMINDER_DAYS.
		// The one-day window on the application date makes the reminder fire once.
		const withStaleCandidates = (await prisma.teamVacancy.findMany({
			where: {
				status: TeamVacancyStatus.Published,
				finishedAt: { gte: today.toDate() },
				id: { notIn: expiringSoon.map((vacancy) => vacancy.id) },
				applicants: {
					some: {
						status: TeamMemberStatus.Applicant,
						createdAt: {
							gte: today.subtract(CANDIDATE_REMINDER_DAYS + 1, "day").toDate(),
							lt: today.subtract(CANDIDATE_REMINDER_DAYS, "day").toDate(),
						},
					},
				},
			},
			include: withPendingCandidates,
		})) as VacancyWithCandidates[];

		for (const vacancy of withStaleCandidates) {
			await notifyAuthor(vacancy, (projectName) =>
				candidatesWaiting(
					vacancy.title,
					projectName,
					vacancy._count.applicants,
				),
			);
		}

		const sent = {
			reminded: expiringSoon.length,
			candidateReminders: withStaleCandidates.length,
		};

		// 3) Archive listings that ended before today and notify their authors.
		const notRelevantVacancies = (await prisma.teamVacancy.findMany({
			where: {
				status: TeamVacancyStatus.Published,
				finishedAt: { lt: today.toDate() },
			},
			...vacancyWithAuthor,
		})) as VacancyWithAuthor[];

		if (notRelevantVacancies.length === 0) {
			return { archived: 0, ...sent };
		}

		const updatedVacancies = await prisma.teamVacancy.updateMany({
			where: { id: { in: notRelevantVacancies.map((vacancy) => vacancy.id) } },
			data: { status: TeamVacancyStatus.Closed },
		});

		for (const vacancy of notRelevantVacancies) {
			// Archiving the listing ends its conversations too.
			try {
				await closeVacancyChats(vacancy.id);
			} catch (error) {
				console.error("[cron.relevant-vacancies] chat close failed:", error);
			}
			await notifyAuthor(vacancy, (projectName) =>
				vacancyArchived(vacancy.title, projectName),
			);
		}

		return { archived: updatedVacancies.count, ...sent };
	});

	return json(result ?? null);
});
