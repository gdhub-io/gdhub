"use client";

import { useTolgee } from "@tolgee/react";
import { ConfigProvider, Layout } from "antd";
import enLocale from "antd/locale/en_US";
import ruLocale from "antd/locale/ru_RU";
import type { ReactNode } from "react";
import { publicThemeConfig } from "@/config/theme";

/**
 * Минимальная обвязка для страниц аутентификации (signin, registration).
 * Только AntD ConfigProvider + Layout, без шапки/футера/нав-меню.
 */
export function AuthShell({ children }: { children: ReactNode }) {
	const { getLanguage } = useTolgee();

	return (
		<ConfigProvider
			theme={publicThemeConfig}
			locale={getLanguage() === "en" ? enLocale : ruLocale}
		>
			<Layout>{children}</Layout>
		</ConfigProvider>
	);
}
