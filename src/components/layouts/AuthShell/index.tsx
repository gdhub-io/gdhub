"use client";

import { useTolgee } from "@tolgee/react";
import { ConfigProvider, Layout } from "antd";
import enLocale from "antd/locale/en_US";
import ruLocale from "antd/locale/ru_RU";
import type { ReactNode } from "react";
import { productTheme } from "@/config/design";
import { AuthLogout } from "./AuthLogout";
import styles from "./style.module.scss";

/** Sign-in and registration are the way into the product, so they run its density. */
export function AuthShell({ children }: { children: ReactNode }) {
	const { getLanguage } = useTolgee();

	return (
		<ConfigProvider
			theme={productTheme}
			locale={getLanguage() === "en" ? enLocale : ruLocale}
		>
			<Layout className={styles.shell}>
				<AuthLogout />
				{children}
			</Layout>
		</ConfigProvider>
	);
}
