"use client";

import { IconChevronDown } from "@tabler/icons-react";
import type { ReactNode } from "react";
import styles from "./style.module.scss";

export type DisclosureSectionProps = {
	title: string;
	/** Small pill after the title — how many rows the panel holds. */
	count?: number;
	/**
	 * Can the reader fold it away on a phone? The pitch and the cover are what
	 * the page is for, so they stay open; the facts below them fold.
	 */
	collapsible?: boolean;
	/** Start unfolded on a phone. Ignored when `collapsible` is false. */
	defaultOpen?: boolean;
	/** Drop the card frame on a phone — for prose that belongs on the page. */
	bare?: boolean;
	/**
	 * The panel holds a list whose rows carry their own padding and separators.
	 * Without this the panel's padding insets the rows and their rules stop
	 * short of the card's edges.
	 */
	flush?: boolean;
	children: ReactNode;
	className?: string;
};

/**
 * One block, two shapes — the card the hub and the project page both use.
 *
 * On a wide screen it is a card: framed, titled, always open. On a phone the
 * frame would waste the width it costs, so the same markup reads as a row in a
 * list you can fold — hairline above, label and chevron, panel underneath.
 *
 * A collapsible one is a real `<details>`, so folding needs no JavaScript and
 * the keyboard and screen readers get the behaviour for free. The desktop card
 * is opened by CSS rather than by re-rendering a different tree: a block that
 * changes component at a breakpoint loses its state and flashes on hydration.
 */
export function DisclosureSection({
	title,
	count,
	collapsible = true,
	defaultOpen = false,
	bare = false,
	flush = false,
	children,
	className,
}: DisclosureSectionProps) {
	const rootClass = [
		styles.section,
		bare && styles.bare,
		flush && styles.flush,
		className,
	]
		.filter(Boolean)
		.join(" ");

	const label = (
		<span className={styles.label}>
			{title}
			{count !== undefined && count > 0 && (
				<span className={styles.count}>{count}</span>
			)}
		</span>
	);

	if (!collapsible) {
		return (
			<section className={rootClass}>
				<div className={styles.summary}>{label}</div>
				<div className={styles.panel}>{children}</div>
			</section>
		);
	}

	return (
		<details open={defaultOpen} className={rootClass}>
			<summary className={styles.summary}>
				{label}
				<IconChevronDown size={18} className={styles.chevron} />
			</summary>
			<div className={styles.panel}>{children}</div>
		</details>
	);
}

export default DisclosureSection;
