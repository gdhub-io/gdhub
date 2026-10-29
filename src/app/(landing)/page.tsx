import type { Metadata } from "next";
import HeroBgImage from "@/assets/images/landing/hero-bg.png";
import {
	EMPTY_LANDING_DATA,
	getLandingData,
} from "@/repositories/content/landing";
import { prisma } from "@/services/prisma";
import { HomeClient, type HomeStats } from "./HomeClient";

const TITLE = "Game Developers Hub";
const DESCRIPTION =
	"Game Developers Hub is a platform for game developers and specialists.";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";
const OG_IMAGE =
	`${APP_URL}/api/og?t=${encodeURIComponent(TITLE)}` +
	`&st=${encodeURIComponent("for everyone who wants to make video games")}` +
	`&img=${encodeURIComponent(APP_URL + HeroBgImage.src)}`;

/**
 * The landing is the one page that is actually meant to be indexed, so its tags
 * are built here rather than in the client shell: metadata has to be in the
 * server response for a crawler to see it.
 *
 * `title.absolute` skips the `%s · GDHub` template from the root layout — the
 * home page is the site, not a page within it.
 */
export const metadata: Metadata = {
	title: { absolute: TITLE },
	description: DESCRIPTION,
	alternates: { canonical: "/" },
	openGraph: {
		type: "website",
		url: "/",
		title: TITLE,
		description: DESCRIPTION,
		images: [
			{
				url: OG_IMAGE,
				width: 1200,
				height: 360,
				alt: "Game Developers Hub cover",
			},
		],
	},
};

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
		return <HomeClient stats={stats} data={EMPTY_LANDING_DATA} />;
	}

	const data = getLandingData();

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

	return <HomeClient stats={stats} data={await data} />;
}
