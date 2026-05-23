"use client";

import { useTolgee } from "@tolgee/react";
import { ConfigProvider, Layout } from "antd";
import enLocale from "antd/locale/en_US";
import ruLocale from "antd/locale/ru_RU";
import type { ReactNode } from "react";
import { publicThemeConfig } from "@/config/theme";
import styles from "./style.module.scss";

export function AuthShell({ children }: { children: ReactNode }) {
	const { getLanguage } = useTolgee();

	return (
		<ConfigProvider
			theme={publicThemeConfig}
			locale={getLanguage() === "en" ? enLocale : ruLocale}
		>
			<Layout className={styles.shell}>{children}</Layout>
		</ConfigProvider>
	);
}
