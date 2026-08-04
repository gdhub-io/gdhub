import classNames from "classnames";
import type React from "react";
import { SectionHeading, ViewAllLink } from "@/components/ui";
import styles from "./hubSection.module.scss";

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
	/** Card headers sit a rank below page sections. */
	level?: 3 | 4;
	linkHref?: string;
	linkLabel?: React.ReactNode;
	className?: string;
	children?: React.ReactNode;
};

/**
 * Card header for a hub panel.
 *
 * It delegates to `<SectionHeading>` and `<ViewAllLink>` rather than styling a
 * title of its own — this used to be a 14px span with a grey link, which is a
 * second answer to a question the design system had already answered.
 *
 * `title` and `linkLabel` stay `ReactNode` because callers pass translated
 * fragments; the primitives want strings, so anything richer than a string keeps
 * the old markup path.
 */
export function HubSectionHeader({
	title,
	level = 4,
	linkHref,
	linkLabel,
	className,
	children,
}: HubSectionHeaderProps) {
	const action =
		children ??
		(linkHref && typeof linkLabel === "string" ? (
			<ViewAllLink href={linkHref} label={linkLabel} />
		) : null);

	if (typeof title !== "string") {
		return (
			<div className={classNames(styles.sectionHead, className)}>
				<span className={styles.sectionTitle}>{title}</span>
				{action}
			</div>
		);
	}

	return (
		<SectionHeading
			level={level}
			title={title}
			action={action}
			className={classNames(styles.sectionHead, className)}
		/>
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
