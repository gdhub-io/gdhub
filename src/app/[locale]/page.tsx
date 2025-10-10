import type { AvailableLocales } from "@/config/locale";
import { prisma } from "@/services/prisma";
import { HomeClient } from "./HomeClient";

export const revalidate = 360;

async function getStats() {
	const isHealthy = await prisma.$isHealthy();
	if (!isHealthy) {
		return {
			usersCount: null,
			specialitiesCount: null,
			projectsCount: null,
			vacanciesCount: null,
		};
	}

	let usersCount: number | null = null;
	let specialitiesCount: number | null = null;
	let projectsCount: number | null = null;
	let vacanciesCount: number | null = null;
	try {
		usersCount = await prisma.user.count();
		specialitiesCount = await prisma.speciality.count();
		projectsCount = await prisma.project.count({ where: { status: "Approved" } });
		vacanciesCount = await prisma.teamVacancy.count({ where: { status: "Published" } });
	} catch (e) {
		console.error(e);
	}
	return { usersCount, specialitiesCount, projectsCount, vacanciesCount };
}

export default async function LocaleHome({ params }: { params: { locale: AvailableLocales } }) {
	const stats = await getStats();
	return <HomeClient stats={stats} locale={params.locale} />;
}
