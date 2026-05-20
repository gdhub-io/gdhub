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
		stats.usersCount = await prisma.user.count();
		stats.specialitiesCount = await prisma.speciality.count();
		stats.projectsCount = await prisma.project.count({
			where: { status: "Approved" },
		});
		stats.vacanciesCount = await prisma.teamVacancy.count({
			where: { status: "Published" },
		});

		const timeForWork: { sum_min: number; sum_max: number }[] =
			await prisma.$queryRaw`
			SELECT
				COUNT(p.*)::integer as count,
				SUM(p."timeForWork"[1])::integer as sum_min,
				SUM(p."timeForWork"[2])::integer as sum_max
			FROM "Profile" p
			LEFT JOIN "User" u ON u.id = p."userId"
			WHERE p."timeForWork" IS NOT NULL AND u."onboardingDone" = TRUE
		`;

		const avgRate = 15;
		stats.investmentAmount = timeForWork?.length
			? timeForWork[0].sum_max * avgRate * 4 * 12
			: 0;
	} catch (error) {
		console.error(error);
	}

	return <HomeClient stats={stats} />;
}
