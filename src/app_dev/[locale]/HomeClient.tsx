"use client";

import { ConfigProvider } from "antd";
import enLocale from "antd/locale/en_US";
import ruLocale from "antd/locale/ru_RU";
import { LandingContactsSection } from "@/components/landing/LandingContactsSection";
import { LandingFeedbackSection } from "@/components/landing/LandingFeedbackSection";
import { LandingForAuthorsSection } from "@/components/landing/LandingForAuthorsSection";
import { LandingForSpecialistsSection } from "@/components/landing/LandingForSpecialistsSection";
import { LandingHeroSection } from "@/components/landing/LandingHeroSection";
import { LandingRecentDevlogsSection } from "@/components/landing/LandingRecentDevlogsSection";
import { LandingWhoWeAreSection } from "@/components/landing/LandingWhoWeAreSection";
import { publicThemeConfig } from "@/config/theme";
import { LandingLayout } from "@/layouts/LandingLayout";
import styles from "./style.module.scss";

export function HomeClient({ stats, locale }: { stats: any; locale: "en" | "ru" }) {
	return (
		<ConfigProvider theme={publicThemeConfig} locale={locale === "en" ? enLocale : ruLocale}>
			<LandingLayout>
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
	);
}
