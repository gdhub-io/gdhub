import { TbWorld } from "@react-icons/all-files/tb/TbWorld";
import { useTolgee } from "@tolgee/react";
import { Button, Dropdown, type MenuProps, Typography } from "antd";
import { useRouter } from "next/router";
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
	const tolgee = useTolgee(["language"]);

	const langMenuItems = availableLocales.map((locale) => ({
		key: locale,
		label: <Text>{locale === "ru" ? "Русский" : "English"}</Text>,
		value: locale,
	}));

	const handleSelectLanguage: MenuProps["onClick"] = ({ key }) => {
		router.replace(router.pathname, undefined, { locale: key });
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
