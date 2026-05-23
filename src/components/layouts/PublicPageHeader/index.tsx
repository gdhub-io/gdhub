"use client";

import { Flex, Layout, Typography } from "antd";
import type { ReactNode } from "react";
import PublicHeaderBg from "@/assets/images/public-header-bg.png";
import { MainHeader } from "@/components/MainHeader";
import styles from "./style.module.scss";

const { Header } = Layout;
const { Title } = Typography;

interface PublicPageHeaderProps {
	title?: ReactNode;
	subTitle?: ReactNode;
	subLine?: ReactNode;
	backgroundImage?: string;
	extra?: ReactNode;
	extraPosition?: "left" | "top";
	extraGap?: number;
}

/**
 * Hero-блок для публичной страницы: MainHeader (общая навигация) + фоновое
 * изображение + заголовок + subTitle + опциональный extra-слот.
 * Рендерится самой страницей в её JSX, а не layout'ом, чтобы каждая страница
 * сама задавала свой title/background.
 *
 * MainHeader находится ВНУТРИ hero-блока — они визуально один тёмный блок
 * (как в оригинальном `PublicLayout`).
 */
export function PublicPageHeader({
	title,
	subTitle,
	subLine,
	backgroundImage,
	extra,
	extraPosition = "left",
	extraGap = 16,
}: PublicPageHeaderProps) {
	const background = backgroundImage
		? `linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.85) 40%, rgba(117, 19, 93, 0.3)), url(${backgroundImage})`
		: `url(${PublicHeaderBg.src})`;

	return (
		<Header
			className={styles.header}
			style={{ backgroundImage: background, position: "relative" }}
		>
			<MainHeader />
			<div className={styles.titleContainer}>
				<Flex
					align={extraPosition === "top" ? "start" : "center"}
					gap={extraGap}
					vertical={extraPosition === "top"}
				>
					{extra}
					{!!title && (
						<Title
							className={
								extraPosition === "top" ? styles.titleTop : styles.title
							}
						>
							{title}
						</Title>
					)}
				</Flex>
				{!!subTitle && <div className={styles.subTitle}>{subTitle}</div>}
				{!!subLine && subLine}
			</div>
		</Header>
	);
}
