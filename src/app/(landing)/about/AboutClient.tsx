"use client";

import { useTolgee } from "@tolgee/react";
import { ConfigProvider } from "antd";
import enLocale from "antd/locale/en_US";
import ruLocale from "antd/locale/ru_RU";
import { LandingContactsSection } from "@/components/landing/LandingContactsSection";
import { LandingWhoWeAreSection } from "@/components/landing/LandingWhoWeAreSection";
import { LandingLayout } from "@/components/layouts/LandingLayout";
import { publicTheme } from "@/config/design";
import styles from "./about.module.scss";

/** Frames `s3zXL` / `OpFVB`: who we are, moved off the landing (GDHUB-109). */
export function AboutClient() {
	const { getLanguage } = useTolgee();

	return (
		<ConfigProvider
			theme={publicTheme}
			locale={getLanguage() === "en" ? enLocale : ruLocale}
		>
			<LandingLayout>
				<div className={styles.page} data-gd-landing>
					<LandingWhoWeAreSection />
					<LandingContactsSection />
				</div>
			</LandingLayout>
		</ConfigProvider>
	);
}
