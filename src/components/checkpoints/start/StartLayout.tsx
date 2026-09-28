"use client";

import { useTranslate } from "@tolgee/react";
import { Button, Flex, Typography } from "antd";
import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./StartLayout.module.scss";

/**
 * The shell every question of the purchase shares — frames `W76sA5` … `tmP5M`.
 *
 * Six bars across the top say where the purchase has got to, and nothing else
 * does: the step's name is already under the bar it belongs to, so the panel
 * never repeats it, and the count is the bars themselves rather than a sentence.
 *
 * It lives inside the checkpoint page's panel, so it takes the height its
 * content needs; the full-viewport variant is gone with the routes it belonged
 * to.
 */

export const START_STEPS = [
	"now",
	"goal",
	"curator",
	"planning",
	"payment",
] as const;

export type StartStep = (typeof START_STEPS)[number];

/** The questions, then where paying lands — no question of its own. */
const BARS = [...START_STEPS, "ready"] as const;

export type StartLayoutProps = {
	step: (typeof BARS)[number];
	/** One line under the bars saying what this question is for. */
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
		goal: t("checkpoints.prepare.step.goal", "Goal"),
		curator: t("checkpoints.prepare.step.curator", "Curator"),
		planning: t("checkpoints.prepare.step.planning", "Planning"),
		payment: t("checkpoints.prepare.step.payment", "Payment"),
		ready: t("checkpoints.prepare.step.ready", "Ready"),
	};

	return (
		<div className={styles.flow}>
			<Flex vertical gap={24} className={styles.content}>
				<Flex gap={12}>
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

				{!!hint && (
					<Typography.Text className={styles.hint}>{hint}</Typography.Text>
				)}

				<div className={styles.answer}>{children}</div>
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
