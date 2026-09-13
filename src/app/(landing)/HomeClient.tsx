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
import { LandingHeroSection } from "@/components/landing/LandingHeroSection";
import { LandingWhoWeAreSection } from "@/components/landing/LandingWhoWeAreSection";
import { LandingLayout } from "@/components/layouts/LandingLayout";
import { publicTheme } from "@/config/design";
import { useTelegram } from "@/helpers/useTelegram";
import styles from "./home.module.scss";

// The shell and the hero are the first screen, so they are imported normally:
// deferring them to a client-only chunk left the document empty until the
// bundle had run, and the hero illustration is what LCP measures.
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
		<ConfigProvider
			theme={publicTheme}
			locale={getLanguage() === "en" ? enLocale : ruLocale}
		>
			<LandingLayout className={styles.container}>
				<div className={styles.main} data-gd-landing>
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
	);
}
