import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import dayjs from "dayjs";
import { json } from "@/lib/api-handlers";
import { closeVacancyChats } from "@/services/chat/vacancy-keys";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

// How many days before expiry the author gets a "expiring soon" reminder.
const EXPIRY_REMINDER_DAYS = 3;

const vacancyWithAuthor = {
	include: {
		team: { include: { project: { include: { author: true } } } },
	},
} as const;

type VacancyWithAuthor = prismaClient.TeamVacancy & {
	team?: {
		project?:
			| (prismaClient.Project & { author?: prismaClient.User | null })
			| null;
	} | null;
};

async function notifyAuthor(
	vacancy: VacancyWithAuthor,
	payload: { title: string; message: string },
) {
	const author = vacancy.team?.project?.author;
	const projectSlug = vacancy.team?.project?.slug;
	if (!author) return;
	try {
		await NovuService.send({
			template: "default-message",
			to: { subscriberId: author.id, email: author.email ?? undefined },
			payload: {
				...payload,
				redirectUrl: projectSlug
					? `${process.env.NEXT_PUBLIC_APP_URL}/my/projects/${projectSlug}`
					: undefined,
			},
		});
	} catch (error) {
		console.error("[cron.relevant-vacancies] notify failed:", error);
	}
}

export async function GET() {
	// 1) Remind authors whose listing expires in EXPIRY_REMINDER_DAYS days.
	// A 1-day window keyed to the reminder day makes a daily cron fire once.
	const reminderDay = dayjs().add(EXPIRY_REMINDER_DAYS, "day");
	const expiringSoon = (await prisma.teamVacancy.findMany({
		where: {
			status: prismaClient.TeamVacancyStatus.Published,
			finishedAt: {
				gte: reminderDay.startOf("day").toDate(),
				lte: reminderDay.endOf("day").toDate(),
			},
		},
		...vacancyWithAuthor,
	})) as VacancyWithAuthor[];

	for (const vacancy of expiringSoon) {
		await notifyAuthor(vacancy, {
			title: "Vacancy expiring soon",
			message: `Your vacancy "${vacancy.title}" will be archived in ${EXPIRY_REMINDER_DAYS} days.`,
		});
	}

	// 2) Archive expired listings and notify their authors.
	const notRelevantVacancies = (await prisma.teamVacancy.findMany({
		where: {
			status: prismaClient.TeamVacancyStatus.Published,
			finishedAt: { lt: dayjs().endOf("day").toDate() },
		},
		...vacancyWithAuthor,
	})) as VacancyWithAuthor[];

	if (notRelevantVacancies.length === 0) {
		return json({ archived: 0, reminded: expiringSoon.length });
	}

	const updatedVacancies = await prisma.teamVacancy.updateMany({
		where: { id: { in: notRelevantVacancies.map((vacancy) => vacancy.id) } },
		data: { status: prismaClient.TeamVacancyStatus.Closed },
	});

	for (const vacancy of notRelevantVacancies) {
		// Archiving the listing ends its conversations too.
		try {
			await closeVacancyChats(vacancy.id);
		} catch (error) {
			console.error("[cron.relevant-vacancies] chat close failed:", error);
		}
		await notifyAuthor(vacancy, {
			title: "Vacancy archived",
			message: `Your vacancy "${vacancy.title}" has expired and was archived.`,
		});
	}

	console.log(`${updatedVacancies.count} vacancies archived`);
	return json({
		archived: updatedVacancies.count,
		reminded: expiringSoon.length,
	});
}
