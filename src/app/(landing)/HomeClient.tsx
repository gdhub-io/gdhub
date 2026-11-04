"use client";

import { useTolgee } from "@tolgee/react";
import { ConfigProvider } from "antd";
import enLocale from "antd/locale/en_US";
import ruLocale from "antd/locale/ru_RU";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { LazyHeroGame } from "@/components/landing/HeroGame/LazyHeroGame";
import {
	LandingAuthorsSection,
	LandingExpertsSection,
	LandingScoutsSection,
	LandingTalentsSection,
} from "@/components/landing/LandingAudienceSections";
import { LandingCheckpointSection } from "@/components/landing/LandingCheckpointSection";
import { LandingEcosystemSection } from "@/components/landing/LandingEcosystemSection";
import { LandingHeroSection } from "@/components/landing/LandingHeroSection";
import { LandingLayout } from "@/components/layouts/LandingLayout";
import { publicTheme } from "@/config/design";
import { useCheckpointPurchaseOpen } from "@/contexts/CheckpointPurchaseContext";
import { useTelegram } from "@/helpers/useTelegram";
import type { LandingData } from "@/repositories/content/landing";
import styles from "./home.module.scss";

export interface HomeStats {
	usersCount: number | null;
	specialitiesCount: number | null;
	projectsCount: number | null;
	vacanciesCount: number | null;
	investmentAmount: number;
}

export function HomeClient({
	stats,
	data,
}: {
	stats: HomeStats;
	data: LandingData;
}) {
	const { getLanguage } = useTolgee();
	const router = useRouter();
	const [isOpenedInTelegram, telegramUser, telegramApp] = useTelegram();
	const [, setSignInProcessing] = useState(false);
	const checkpointOpen = useCheckpointPurchaseOpen();

	const handleSignInTelegram = useCallback(async () => {
		if (!isOpenedInTelegram) return;

		try {
			setSignInProcessing(true);
			const res = await signIn(
				"telegram-web-app",
				{ redirect: false },
				{ username: telegramUser.username },
			);

			if (!res?.ok) {
				if (res?.status === 401) {
					setSignInProcessing(false);
					return;
				}
				throw new Error(`Error ${res?.status}. ${res?.error}`);
			}

			router.push("/hub");
		} catch (error: any) {
			telegramApp.showAlert(error.message);
			setSignInProcessing(false);
		}
	}, [isOpenedInTelegram, telegramUser, telegramApp, router]);

	useEffect(() => {
		if (isOpenedInTelegram) {
			handleSignInTelegram();
		}
	}, [isOpenedInTelegram, handleSignInTelegram]);

	return (
		<ConfigProvider
			theme={publicTheme}
			locale={getLanguage() === "en" ? enLocale : ruLocale}
		>
			<LandingLayout className={styles.container}>
				<div className={styles.main} data-gd-landing>
					<LandingHeroSection stats={stats} art={<LazyHeroGame />} />
					<LandingEcosystemSection liveLine={data.liveLine} />
					{checkpointOpen && <LandingCheckpointSection />}
					<LandingAuthorsSection projects={data.projects} />
					<LandingTalentsSection
						vacancies={data.vacancies}
						talents={data.talents}
					/>
					<LandingScoutsSection storeProjects={data.storeProjects} />
					<LandingExpertsSection experts={data.experts} />
				</div>
			</LandingLayout>
		</ConfigProvider>
	);
}
