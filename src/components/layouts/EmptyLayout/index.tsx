import { useTolgee } from "@tolgee/react";
import { ConfigProvider, Layout } from "antd";
import enLocale from "antd/locale/en_US";
import ruLocale from "antd/locale/ru_RU";
import { publicTheme } from "@/config/design";
import styles from "./style.module.scss";

export const EmptyLayout = ({ children, type = "light" }: any) => {
	const { getLanguage } = useTolgee();

	return (
		<ConfigProvider
			theme={publicTheme}
			locale={getLanguage() == "en" ? enLocale : ruLocale}
		>
			<Layout className={styles.container}>{children}</Layout>
		</ConfigProvider>
	);
};
