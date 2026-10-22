"use client";

import { useTranslate } from "@tolgee/react";
import { Button, Flex, Typography } from "antd";
import Link from "next/link";
import type { ReactNode } from "react";
import GdhubLogo from "@/assets/images/gdhub-beta-black-logo.svg";
import { LogOutButton } from "@/components/layouts/AuthShell/AuthLogout";
import styles from "./EntryShell.module.scss";

export type EntryShellProps = {
	/** The user has had a checkpoint before: the title heads for the next one. */
	next?: boolean;
	/** Sits under the title — the wizard's Goal · Curator · Payment. */
	stepper?: ReactNode;
	/** A sub-page's own heading (24/700) and the line under it. */
	heading?: string;
	subtitle?: string;
	children: ReactNode;
	/** The page's actions, right-aligned under a hairline. */
	foot?: ReactNode;
};

/**
 * The light shell of the way into a checkpoint (row 12.x): a top row with the
 * logo and the ways out, the title, then the page — all in the content column.
 * Lives inside `AuthShell`, which owns the white ground; its log-out corner
 * stands down here for the row's own.
 */
export function EntryShell({
	next,
	stepper,
	heading,
	subtitle,
	children,
	foot,
}: EntryShellProps) {
	const { t } = useTranslate();

	return (
		<div className={styles.page}>
			<div className={styles.column}>
				<header className={styles.header}>
					<Flex justify="space-between" align="center" className={styles.top}>
						<GdhubLogo className={styles.logo} />
						<Flex gap={4}>
							<Link href="/">
								<Button type="text">
									{t("checkpointEntry.toHome", "To home")}
								</Button>
							</Link>
							<LogOutButton />
						</Flex>
					</Flex>
					<Typography.Title level={1} className={styles.title}>
						{next
							? t("checkpointEntry.title.next", "Head for your next checkpoint")
							: t(
									"checkpointEntry.title.first",
									"Head for your first checkpoint",
								)}
					</Typography.Title>
					{stepper}
				</header>

				<Flex vertical gap={32}>
					{heading && (
						<Flex vertical gap={4}>
							<Typography.Title level={2} className={styles.heading}>
								{heading}
							</Typography.Title>
							{subtitle && (
								<Typography.Text className={styles.subtitle}>
									{subtitle}
								</Typography.Text>
							)}
						</Flex>
					)}
					{children}
				</Flex>

				{foot && <footer className={styles.foot}>{foot}</footer>}
			</div>
		</div>
	);
}
