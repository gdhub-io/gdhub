"use client";

import { IconArrowLeft } from "@tabler/icons-react";
import { Flex, Layout, Typography } from "antd";
import Link from "next/link";
import type { ReactNode } from "react";
import PublicHeaderBg from "@/assets/images/public-header-bg.png";
import { MainHeader } from "@/components/MainHeader";
import { InverseBand } from "@/components/ui/InverseBand";
import styles from "./style.module.scss";

const { Header } = Layout;
const { Title } = Typography;

interface PublicPageHeaderProps {
	title?: ReactNode;
	subTitle?: ReactNode;
	subLine?: ReactNode;
	backgroundImage?: string;
	/** Link back to the parent page, rendered above the title. */
	backTo?: { href: string; label: ReactNode };
	/** Extra content on the back-link row (breadcrumb tail, badges). */
	extra?: ReactNode;
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
	backTo,
	extra,
}: PublicPageHeaderProps) {
	const background = backgroundImage
		? `linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.85) 40%, rgba(117, 19, 93, 0.3)), url(${backgroundImage})`
		: `url(${PublicHeaderBg.src})`;

	return (
		// The hero is artwork-dark, so everything inside it — the nav, the CTA —
		// has to read against a dark surface. `transparent` keeps the background
		// image visible while the roles and the antd theme flip underneath.
		<InverseBand transparent>
			<Header
				className={styles.header}
				style={{ backgroundImage: background, position: "relative" }}
			>
				<MainHeader />
				<div className={styles.titleContainer}>
					<Flex align="start" gap={8} vertical>
						{(!!backTo || !!extra) && (
							<Flex className={styles.extra} align="center" gap={8}>
								{!!backTo && (
									<Link href={backTo.href} className={styles.backLink}>
										<IconArrowLeft size={16} />
										<span>{backTo.label}</span>
									</Link>
								)}
								{extra}
							</Flex>
						)}
						{!!title && <Title className={styles.title}>{title}</Title>}
					</Flex>
					{!!subTitle && <div className={styles.subTitle}>{subTitle}</div>}
					{!!subLine && subLine}
				</div>
			</Header>
		</InverseBand>
	);
}
