import { prisma } from "@/services/prisma";
import { HomeClient, type HomeStats } from "./HomeClient";

export const revalidate = 360;

export default async function HomePage() {
	const isHealthy = await prisma.$isHealthy();

	const stats: HomeStats = {
		usersCount: null,
		specialitiesCount: null,
		projectsCount: null,
		vacanciesCount: null,
		investmentAmount: 0,
	};

	if (!isHealthy) {
		return <HomeClient stats={stats} />;
	}

	try {
		const [
			usersCount,
			specialitiesCount,
			projectsCount,
			vacanciesCount,
			timeForWork,
		] = await Promise.all([
			prisma.user.count(),
			prisma.speciality.count(),
			prisma.project.count({ where: { status: "Approved" } }),
			prisma.teamVacancy.count({ where: { status: "Published" } }),
			prisma.$queryRaw<{ sum_min: number; sum_max: number }[]>`
			SELECT
				COUNT(p.*)::integer as count,
				SUM(p."timeForWork"[1])::integer as sum_min,
				SUM(p."timeForWork"[2])::integer as sum_max
			FROM "Profile" p
			LEFT JOIN "User" u ON u.id = p."userId"
			WHERE p."timeForWork" IS NOT NULL AND u."onboardingDone" = TRUE
		`,
		]);

		stats.usersCount = usersCount;
		stats.specialitiesCount = specialitiesCount;
		stats.projectsCount = projectsCount;
		stats.vacanciesCount = vacanciesCount;

		const avgRate = 15;
		stats.investmentAmount = timeForWork?.length
			? timeForWork[0].sum_max * avgRate * 4 * 12
			: 0;
	} catch (error) {
		console.error(error);
	}

	return <HomeClient stats={stats} />;
}
