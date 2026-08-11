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
 * Per-page hero for protected pages: optional breadcrumbs above the title, a
 * back button, title, extra slot and subTitle. It does not include the top nav
 * (logo, dropdown and so on) — that belongs to `ProtectedShell`. The page
 * renders it itself, as the first child inside
 * `<div className="layout-background">`.
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
								{/* No `padding: 0`: it shrank the button to the icon's own box,
								    leaving the hover fill nowhere to show. The square tile is
								    what the design draws, and antd's default size already is it. */}
								<Button type="text" icon={<IconArrowLeft />} />
							</Link>
						) : (
							<Button
								type="text"
								icon={<IconArrowLeft />}
								onClick={() => router.back()}
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
