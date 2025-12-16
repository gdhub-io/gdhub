import { useTolgee } from "@tolgee/react";
import { ConfigProvider } from "antd";
import enLocale from "antd/locale/en_US";
import ruLocale from "antd/locale/ru_RU";
import { type GetStaticPropsContext, NextApiRequest } from "next";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { LandingContactsSection } from "@/components/landing/LandingContactsSection";
import { LandingFeedbackSection } from "@/components/landing/LandingFeedbackSection";
import { LandingWhoWeAreSection } from "@/components/landing/LandingWhoWeAreSection";
import { publicThemeConfig } from "@/config/theme";
import { useTelegram } from "@/helpers/useTelegram";
import { prisma } from "@/services/prisma";
import type { NextPageWithLayout } from "./_app";
import styles from "./home.module.scss";

const LandingLayout = dynamic(
	() => import("@/layouts/LandingLayout").then((m) => m.LandingLayout),
	{
		ssr: false,
	},
);
const LandingHeroSection = dynamic(
	() =>
		import("@/components/landing/LandingHeroSection").then(
			(m) => m.LandingHeroSection,
		),
	{ ssr: false },
);

const LandingForAuthorsSection = dynamic(
	() =>
		import("@/components/landing/LandingForAuthorsSection").then(
			(m) => m.LandingForAuthorsSection,
		),
	{ ssr: false },
);
const LandingGameCreationSection = dynamic(
	() =>
		import("@/components/landing/LandingGameCreationSection").then(
			(m) => m.LandingGameCreationSection,
		),
	{ ssr: false },
);
const LandingForSpecialistsSection = dynamic(
	() =>
		import("@/components/landing/LandingForSpecialistsSection").then(
			(m) => m.LandingForSpecialistsSection,
		),
	{ ssr: false },
);
const LandingRecentDevlogsSection = dynamic(
	() =>
		import("@/components/landing/LandingRecentDevlogsSection").then(
			(m) => m.LandingRecentDevlogsSection,
		),
	{ ssr: false },
);

declare global {
	interface Window {
		$crisp?: any;
	}
}

interface LandingPageParams {
	isHealthy: boolean;
	stats: {
		usersCount: number | null;
		specialitiesCount: number | null;
		projectsCount: number | null;
		vacanciesCount: number | null;
		investmentAmount: number;
	};
}

const LandingPage: NextPageWithLayout<LandingPageParams> = ({ stats }) => {
	const { getLanguage } = useTolgee();
	const router = useRouter();
	const [isOpenedInTelegram, telegramUser, telegramApp] = useTelegram();
	const [signInProcessing, setSignInProcessing] = useState(false);

	useEffect(() => {
		if (isOpenedInTelegram) {
			handleSignInTelegram();
		}
	}, [isOpenedInTelegram]);

	const handleSignInTelegram = async () => {
		if (!isOpenedInTelegram) return;

		try {
			setSignInProcessing(true);
			const res = await signIn(
				"telegram-web-app",
				{ redirect: false },
				{ username: telegramUser.username },
			);

			if (!res?.ok) {
				if (res?.status == 401) {
					setSignInProcessing(false);
					return;
				} else {
					throw new Error(`Error ${res?.status}. ${res?.error}`);
				}
			}

			router.push("/hub");
		} catch (error: any) {
			telegramApp.showAlert(error.message);
			setSignInProcessing(false);
		}
	};

	return (
		<>
			{/* <Head>
				<title>Game Developers Hub</title>
			</Head> */}
			<ConfigProvider
				theme={publicThemeConfig}
				locale={getLanguage() == "en" ? enLocale : ruLocale}
			>
				<LandingLayout className={styles.container}>
					<div className={styles.main}>
						<LandingHeroSection stats={stats} />
						<LandingWhoWeAreSection />
						<LandingForAuthorsSection />
						<LandingGameCreationSection />
						<LandingForSpecialistsSection />
						<LandingRecentDevlogsSection />
						<LandingFeedbackSection />
						<LandingContactsSection />
					</div>
				</LandingLayout>
			</ConfigProvider>
		</>
	);
};

export async function getStaticProps({ locale }: GetStaticPropsContext) {
	const isHealthy = await prisma.$isHealthy();

	if (!isHealthy) {
		return { props: { isHealthy: false } };
	}

	const stats: LandingPageParams["stats"] = {
		usersCount: null,
		specialitiesCount: null,
		projectsCount: null,
		vacanciesCount: null,
		investmentAmount: 0,
	};

	try {
		stats.usersCount = await prisma.user.count();
		stats.specialitiesCount = await prisma.speciality.count();
		stats.projectsCount = await prisma.project.count({
			where: { status: "Approved" },
		});
		stats.vacanciesCount = await prisma.teamVacancy.count({
			where: { status: "Published" },
		});

		const timeForWork: { lang: string; sum_min: number; sum_max: number }[] =
			await prisma.$queryRaw`
			SELECT 
				COUNT(p.*)::integer as count, 
				u.lang, 
				SUM(p."timeForWork"[1])::integer as sum_min, 
				SUM(p."timeForWork"[2])::integer as sum_max 
			FROM "Profile" p
			LEFT JOIN "User" u ON u.id = p."userId"
			WHERE p."timeForWork" IS NOT NULL AND u."onboardingDone" = TRUE
			GROUP BY u."lang"
		`;

		const avgRate = 15; // for levels: 11, 13, 15, 17, 19
		const timeForWorkData = timeForWork.find((t) => t.lang === locale);
		stats.investmentAmount = timeForWorkData
			? timeForWorkData.sum_max * avgRate * 4 * 12
			: 0;

		// console.log(locale, timeForWork);
	} catch (error) {
		console.error(error);
	}

	return {
		props: {
			stats,
		},
		revalidate: 360,
	};
}

export default LandingPage;
