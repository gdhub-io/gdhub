import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import axios from "axios";
import VacancyClient from "./Client";

export const revalidate = 300;

type VacancyResponse =
	| (prismaClient.TeamVacancy & {
			team: { project: prismaClient.Project };
			promisePercentage: number;
			promiseStep: prismaClient.ProjectWorkflowStep;
			myTeamMemberId: string;
	  })
	| null;

async function fetchVacancy(id: string, cookie?: string): Promise<VacancyResponse> {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
	const res = await axios.get(`${baseUrl}/api/project/vacancy`, {
		params: { id },
		headers: cookie ? { cookie } : undefined,
	});
	return res.data as VacancyResponse;
}

export default async function VacancyPage({ params }: { params: { vacancyId: string } }) {
	const vacancy = await fetchVacancy(params.vacancyId);
	const pageCover = vacancy?.team?.project?.coverImage || null;
	return <VacancyClient vacancy={vacancy} pageCover={pageCover} />;
}
