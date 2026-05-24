import { TbWorld } from "@react-icons/all-files/tb/TbWorld";
import { useTolgee } from "@tolgee/react";
import { Button, Dropdown, type MenuProps, Typography } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { availableLocales, defaultLocale } from "@/config/locale";
import styles from "./style.module.scss";

const { Text } = Typography;

export const SwitchLanguage = ({
	type = "default",
	border = false,
	size = "middle",
}: {
	type?: "default" | "primary";
	border?: boolean;
	size?: "small" | "middle" | "large";
}) => {
	const router = useRouter();
	const pathname = usePathname();
	const tolgee = useTolgee(["language"]);

	const langMenuItems = availableLocales.map((locale) => ({
		key: locale,
		label: <Text>{locale === "ru" ? "Русский" : "English"}</Text>,
		value: locale,
	}));

	const handleSelectLanguage: MenuProps["onClick"] = ({ key: _key }) => {
		// TODO: App Router migration — Pages Router's `router.replace(path, undefined, { locale })`
		// has no equivalent in next/navigation. Locale switching previously relied on Next.js
		// i18n routing which was removed. This codebase is currently single-locale ('en') and
		// `availableLocales.length <= 1` causes early return below, so this handler is unreachable.
		// Re-implement once a locale-switching strategy is chosen (e.g. middleware or path prefix).
		router.replace(pathname);
	};

	if (availableLocales.length <= 1) {
		return null;
	}

	return (
		<Dropdown
			className={`${styles.switcher} ${border ? styles.withBorder : undefined}`}
			overlayClassName={`${styles.overlay} ${border ? styles.withBorder : undefined}`}
			menu={{ items: langMenuItems, onClick: handleSelectLanguage }}
			placement="bottomLeft"
			trigger={["click"]}
		>
			<Button type="text" size={size} icon={<TbWorld />}>
				{tolgee.getLanguage()}
			</Button>
		</Dropdown>
	);
};
