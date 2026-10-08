"use client";

import { useTranslate } from "@tolgee/react";
import { Button, Flex, Typography } from "antd";
import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./StartLayout.module.scss";

/**
 * The shell every question of the purchase shares — frames 03–06 (`UhPrX` …
 * `guKLF`). Four bars across the top say where the purchase has got to; the
 * step's name is already under its bar, so the heading says what it asks.
 */

export const START_STEPS = ["now", "curator", "payment"] as const;

export type StartStep = (typeof START_STEPS)[number];

/** The questions, then where paying lands — no question of its own. */
const BARS = [...START_STEPS, "ready"] as const;

export type StartLayoutProps = {
	step: (typeof BARS)[number];
	/** The question itself, under the bars. */
	title?: string;
	/** One line under the title saying what this question is for. */
	hint?: string;
	/** Sits above the hint: what the author has to read before the step's own words. */
	notice?: ReactNode;
	children: ReactNode;
	/** Sits between the buttons and the standing note. */
	footNote?: ReactNode;
	/**
	 * What the foot says about the state of the purchase. Defaults to the draft
	 * note; `null` leaves the corner empty, which is what a bought checkpoint
	 * needs — it is no longer a draft and has nothing to report there.
	 */
	saved?: string | null;
	onBack?: () => void;
	/** The way on. Payment has none — its action is in the price card. */
	forward?: ReactNode;
};

export function StartLayout({
	step,
	title,
	hint,
	notice,
	children,
	footNote,
	saved,
	onBack,
	forward,
}: StartLayoutProps) {
	const { t } = useTranslate();
	const index = BARS.indexOf(step);

	const labels: Record<(typeof BARS)[number], string> = {
		now: t("checkpoints.prepare.step.now", "Now"),
		curator: t("checkpoints.prepare.step.curator", "Curator"),
		payment: t("checkpoints.prepare.step.payment", "Payment"),
		ready: t("checkpoints.prepare.step.ready", "Ready"),
	};

	return (
		<div className={styles.flow}>
			<Flex vertical gap={20} className={styles.content}>
				<Flex gap={8}>
					{BARS.map((candidate, position) => (
						<Flex vertical gap={8} key={candidate} className={styles.segment}>
							<span
								className={clsx(
									styles.bar,
									position < index && styles.barDone,
									position === index && styles.barCurrent,
								)}
							/>
							<Typography.Text
								className={styles.segmentLabel}
								data-current={position === index || undefined}
								data-ahead={position > index || undefined}
							>
								{labels[candidate]}
							</Typography.Text>
						</Flex>
					))}
				</Flex>

				{notice}

				<Flex vertical gap={32} className={styles.answer}>
					{(title || hint) && (
						<Flex vertical gap={8}>
							{title && (
								<Typography.Title level={2} className={styles.title}>
									{title}
								</Typography.Title>
							)}
							{hint && (
								<Typography.Text className={styles.hint}>
									{hint}
								</Typography.Text>
							)}
						</Flex>
					)}
					{children}
				</Flex>
			</Flex>

			<footer className={styles.foot}>
				<Flex gap={8}>
					{onBack && (
						<Button onClick={onBack}>
							{t("checkpoints.prepare.back", "Back")}
						</Button>
					)}
					{forward}
				</Flex>
				<Flex gap={12} align="center">
					{footNote}
					{saved !== null && (
						<Typography.Text className={styles.saved}>
							{saved ?? t("checkpoints.prepare.saved", "Saved as a draft")}
						</Typography.Text>
					)}
				</Flex>
			</footer>
		</div>
	);
}
