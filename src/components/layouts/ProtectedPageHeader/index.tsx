"use client";

import { IconArrowLeft } from "@tabler/icons-react";
import {
	Breadcrumb,
	type BreadcrumbProps,
	Button,
	Flex,
	Space,
	Typography,
} from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./style.module.scss";

const { Title } = Typography;

interface ProtectedPageHeaderProps {
	title?: ReactNode;
	subTitle?: ReactNode;
	extra?: ReactNode;
	showBackButton?: boolean;
	backButtonUrl?: string;
	breadcrumbs?: BreadcrumbProps["items"];
}

/**
 * Per-page hero для защищённых страниц: optional breadcrumbs над заголовком,
 * back-button, title, extra-slot и subTitle. Не включает top-nav (logo,
 * dropdown и т.п.) — это часть `ProtectedShell`. Рендерится самой страницей
 * как первый ребёнок внутри `<div className="layout-background">`.
 */
export function ProtectedPageHeader({
	title,
	subTitle,
	extra,
	showBackButton = false,
	backButtonUrl,
	breadcrumbs,
}: ProtectedPageHeaderProps) {
	const router = useRouter();

	return (
		<div className={styles.pageHeader}>
			{breadcrumbs?.length ? (
				<Breadcrumb
					separator={
						<span style={{ color: "var(--gd-color-text-tertiary)" }}>/</span>
					}
					items={breadcrumbs}
					className={styles.breadcrumb}
				/>
			) : null}

			<Flex align="center" justify="space-between" gap={16} wrap>
				<Space>
					{showBackButton &&
						(backButtonUrl ? (
							<Link href={backButtonUrl}>
								<Button
									type="text"
									icon={<IconArrowLeft />}
									style={{ padding: 0 }}
								/>
							</Link>
						) : (
							<Button
								type="text"
								icon={<IconArrowLeft />}
								onClick={() => router.back()}
								style={{ padding: 0 }}
							/>
						))}
					{!!title && (
						<Title style={{ margin: 0 }} className={styles.title}>
							{title}
						</Title>
					)}
				</Space>

				{extra}
			</Flex>

			{!!subTitle && !showBackButton && (
				<div className={styles.subTitle}>{subTitle}</div>
			)}
			{!!subTitle && showBackButton && (
				<div className={styles.subTitleWithBack}>{subTitle}</div>
			)}
		</div>
	);
}
