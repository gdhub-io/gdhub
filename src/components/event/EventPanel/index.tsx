"use client";

import type { ReactNode } from "react";
import styles from "./style.module.scss";

/**
 * A titled block on a public event page.
 *
 * About and Schedule are the same object — a bordered panel with a hairline
 * under its label — so they are one component rather than two that drift.
 * `flush` is for a panel whose rows carry their own padding and separators.
 */
export function EventPanel({
	title,
	flush = false,
	children,
}: {
	title: ReactNode;
	flush?: boolean;
	children: ReactNode;
}) {
	return (
		<section className={styles.panel}>
			<header className={styles.header}>{title}</header>
			<div className={flush ? undefined : styles.body}>{children}</div>
		</section>
	);
}

export default EventPanel;
