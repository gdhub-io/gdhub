import {
	type Project,
	TeamMemberStatus,
	type TeamVacancy,
	TeamVacancyStatus,
	type User,
} from "@gdhub-io/gdhub-prisma";
import dayjs from "dayjs";
import { runWithCronLog } from "@/decorators/QueueCronLog";
import { json, withAuth } from "@/lib/api-handlers";
import { closeVacancyChats } from "@/services/chat/vacancy-keys";
import { NovuService } from "@/services/novu";
import { prisma } from "@/services/prisma";

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
					? `${process.env.NEXT_PUBLIC_APP_URL}/user/project/${projectSlug}`
					: undefined,
			},
		});
	} catch (error) {
		console.error("[cron.relevant-vacancies] notify failed:", error);
	}
}

export const GET = withAuth({ mode: "vercel_cron" })(async () => {
	const result = await runWithCronLog("relevant-vacancies", async () => {
		// Both steps are keyed to the calendar day, not to the moment of the run:
		// a listing is warned on its last day and archived on the next one, so
		// the warning always comes a full run ahead however the cron drifts.
		const today = dayjs().startOf("day");

		// 1) Warn authors whose listing ends today: the next run archives it.
		const expiringSoon = (await prisma.teamVacancy.findMany({
			where: {
				status: TeamVacancyStatus.Published,
				finishedAt: {
					gte: today.toDate(),
					lt: today.add(1, "day").toDate(),
				},
			},
			include: {
				...vacancyWithAuthor.include,
				_count: {
					select: {
						applicants: { where: { status: TeamMemberStatus.Applicant } },
					},
				},
			},
		})) as (VacancyWithAuthor & { _count: { applicants: number } })[];

		for (const vacancy of expiringSoon) {
			const pending = vacancy._count.applicants;
			const action = pending
				? `update its end date or make a decision on the ${pending} ${pending === 1 ? "candidate" : "candidates"} waiting for your answer`
				: "update its end date";
			await notifyAuthor(vacancy, {
				title: "Vacancy will be archived tomorrow",
				message:
					`Your vacancy "${vacancy.title}" will be archived tomorrow and its chats with candidates will be closed. ` +
					`If the vacancy is still relevant, ${action} — otherwise it will close automatically in 24 hours.`,
			});
		}

		// 2) Archive listings that ended before today and notify their authors.
		const notRelevantVacancies = (await prisma.teamVacancy.findMany({
			where: {
				status: TeamVacancyStatus.Published,
				finishedAt: { lt: today.toDate() },
			},
			...vacancyWithAuthor,
		})) as VacancyWithAuthor[];

		if (notRelevantVacancies.length === 0) {
			return { archived: 0, reminded: expiringSoon.length };
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
			await notifyAuthor(vacancy, {
				title: "Vacancy archived",
				message: `Your vacancy "${vacancy.title}" has expired and was archived.`,
			});
		}

		return {
			archived: updatedVacancies.count,
			reminded: expiringSoon.length,
		};
	});

	return json(result ?? null);
});
