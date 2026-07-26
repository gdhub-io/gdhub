"use client";

import { useTolgee } from "@tolgee/react";
import { ConfigProvider } from "antd";
import enLocale from "antd/locale/en_US";
import ruLocale from "antd/locale/ru_RU";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { LandingContactsSection } from "@/components/landing/LandingContactsSection";
import { LandingFeedbackSection } from "@/components/landing/LandingFeedbackSection";
import { LandingWhoWeAreSection } from "@/components/landing/LandingWhoWeAreSection";
import { publicThemeConfig } from "@/config/theme";
import { useTelegram } from "@/helpers/useTelegram";
import styles from "./home.module.scss";

const LandingLayout = dynamic(
	() => import("@/layouts/LandingLayout").then((m) => m.LandingLayout),
	{ ssr: false },
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

export interface HomeStats {
	usersCount: number | null;
	specialitiesCount: number | null;
	projectsCount: number | null;
	vacanciesCount: number | null;
	investmentAmount: number;
}

export function HomeClient({ stats }: { stats: HomeStats }) {
	const { getLanguage } = useTolgee();
	const router = useRouter();
	const [isOpenedInTelegram, telegramUser, telegramApp] = useTelegram();
	const [, setSignInProcessing] = useState(false);

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
		<>
			{/*
			 * The marketing home is dark. Own the dark background here (SSR-rendered,
			 * so no light flash) instead of via the global default — this <style>
			 * unmounts on navigation into the app, reverting to the light default so
			 * the dark background never bleeds into in-app routes.
			 */}
			<style>{`:root{--background-color:#050505}`}</style>
			<ConfigProvider
				theme={publicThemeConfig}
				locale={getLanguage() === "en" ? enLocale : ruLocale}
			>
				<LandingLayout className={styles.container}>
					<div className={styles.main}>
						<LandingHeroSection stats={stats} />
						<LandingWhoWeAreSection />
						<LandingForAuthorsSection />
						<LandingForSpecialistsSection />
						<LandingRecentDevlogsSection />
						<LandingFeedbackSection />
						<LandingContactsSection />
					</div>
				</LandingLayout>
			</ConfigProvider>
		</>
	);
}
