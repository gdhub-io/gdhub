import { useTranslate } from "@tolgee/react";
import { Button, Space, Typography } from "antd";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import styles from "./style.module.scss";

const { Paragraph } = Typography;

export const Error404 = ({
	callbackUrl = "/",
	textBackButton,
	theme = "dark",
	containerStyle,
}: {
	callbackUrl?: string;
	textBackButton?: ReactNode | string;
	theme?: "dark" | "light";
	containerStyle?: CSSProperties;
}) => {
	const { t } = useTranslate();

	return (
		<div
			className={`${styles.errorPageContainer} ${styles[`theme-` + theme]}`}
			style={containerStyle}
		>
			<Space orientation="vertical">
				<div className={styles.notFound}>
					<h1>{t("page.error404.title", "Error 404")}</h1>
				</div>
				<Paragraph>
					{t(
						"page.error404.description",
						"Sorry, we couldn&apos;t find the page you&apos;re looking for.",
					)}
				</Paragraph>
				<Button>
					<Link href={callbackUrl}>
						{textBackButton || t("page.error404.backToHome", "Back to home")}
					</Link>
				</Button>
			</Space>
		</div>
	);
};
