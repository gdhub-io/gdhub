import prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import dayjs from "dayjs";
import { json } from "@/lib/api-handlers";
import { prisma } from "@/services/prisma";

export async function GET() {
	const notRelevantVacancies = await prisma.teamVacancy.findMany({
		where: {
			status: prismaClient.TeamVacancyStatus.Published,
			finishedAt: {
				lt: dayjs().endOf("day").toDate(),
			},
		},
	});

	if (notRelevantVacancies.length === 0) {
		return json({ archived: 0 });
	}

	const updatedVacancies = await prisma.teamVacancy.updateMany({
		where: {
			id: {
				in: notRelevantVacancies.map((vacancy: { id: string }) => vacancy.id),
			},
		},
		data: { status: prismaClient.TeamVacancyStatus.Closed },
	});

	console.log(`${updatedVacancies.count} vacancies archived`);
	return json({ archived: updatedVacancies.count });
}
