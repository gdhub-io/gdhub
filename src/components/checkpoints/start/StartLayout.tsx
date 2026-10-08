"use client";

import { useTranslate } from "@tolgee/react";
import { Button, Flex, Typography } from "antd";
import type { ReactNode } from "react";
import styles from "./StartLayout.module.scss";

/**
 * The shell every question of the purchase shares — frames 03–06 (`UhPrX` …
 * `guKLF`): the question as the heading, "Step n/4" beside it.
 */

export const START_STEPS = ["now", "curator", "payment"] as const;

export type StartStep = (typeof START_STEPS)[number];

/** The questions, then where paying lands — counted as a step of its own. */
const STEPS = [...START_STEPS, "ready"] as const;

export type StartLayoutProps = {
	step: (typeof STEPS)[number];
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
	const index = STEPS.indexOf(step);

	return (
		<div className={styles.flow}>
			<Flex vertical gap={32} className={styles.content}>
				<Flex vertical gap={8}>
					<Flex justify="space-between" align="baseline" gap={16}>
						{title ? (
							<Typography.Title level={2} className={styles.title}>
								{title}
							</Typography.Title>
						) : (
							<span />
						)}
						<Typography.Text className={styles.stepCount}>
							{t("checkpoints.prepare.stepNumber", "Step {current}/{total}", {
								current: index + 1,
								total: STEPS.length,
							})}
						</Typography.Text>
					</Flex>
					{hint && (
						<Typography.Text className={styles.hint}>{hint}</Typography.Text>
					)}
				</Flex>

				{notice}

				<Flex vertical gap={32} className={styles.answer}>
					{children}
				</Flex>
			</Flex>

			{(onBack || forward || footNote || saved !== null) && (
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
			)}
		</div>
	);
}
