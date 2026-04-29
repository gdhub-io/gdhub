import { Typography } from "antd";
import classNames from "classnames";
import Link from "next/link";
import type React from "react";
import styles from "./hubSection.module.scss";

const { Text } = Typography;

export type HubSectionShell = "main" | "inset" | "sidebar";

export function getHubSectionShellClass(shell: HubSectionShell) {
	switch (shell) {
		case "inset":
			return styles.sectionCardInset;
		case "sidebar":
			return styles.sectionCardSidebar;
		default:
			return styles.sectionCard;
	}
}

type HubSectionHeaderProps = {
	title: React.ReactNode;
	linkHref?: string;
	linkLabel?: React.ReactNode;
	className?: string;
	children?: React.ReactNode;
};

export function HubSectionHeader({
	title,
	linkHref,
	linkLabel,
	className,
	children,
}: HubSectionHeaderProps) {
	return (
		<div className={classNames(styles.sectionHead, className)}>
			<span className={styles.sectionTitle}>{title}</span>
			{children ??
				(linkHref && linkLabel ? (
					<Link href={linkHref} className={styles.sectionHeadLink}>
						<Text type="secondary">{linkLabel}</Text>
					</Link>
				) : null)}
		</div>
	);
}

type HubSectionBodyProps = {
	children: React.ReactNode;
	flush?: boolean;
	className?: string;
};

export function HubSectionBody({
	children,
	flush = false,
	className,
}: HubSectionBodyProps) {
	return (
		<div
			className={classNames(
				flush ? styles.sectionBodyFlush : styles.sectionBody,
				className,
			)}
		>
			{children}
		</div>
	);
}

type HubSectionBleedProps = {
	children: React.ReactNode;
	className?: string;
};

export function HubSectionBleed({ children, className }: HubSectionBleedProps) {
	return (
		<div className={classNames(styles.sidebarListBleed, className)}>
			{children}
		</div>
	);
}
