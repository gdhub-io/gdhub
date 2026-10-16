"use client";

import { useTranslate } from "@tolgee/react";
import { Button, Flex, Typography } from "antd";
import type { ReactNode } from "react";
import styles from "./PurchaseLayout.module.scss";

/**
 * What every question of the purchase shares inside the entry shell — frames
 * 12.3–12.5: the question as the heading, the answer and the foot.
 */

export const PURCHASE_STEPS = ["goal", "curator", "payment"] as const;

export type PurchaseStep = (typeof PURCHASE_STEPS)[number];

export type PurchaseLayoutProps = {
	/** The question itself, under the stepper. */
	title?: string;
	/** One line under the title saying what this question is for. */
	hint?: string;
	/** Sits above the hint: what the author has to read before the step's own words. */
	notice?: ReactNode;
	children: ReactNode;
	/** A bought checkpoint is no longer a draft, so the foot drops the draft note. */
	bought?: boolean;
	onBack?: () => void;
	/** The way on. Payment has none — its action is in the price card. */
	forward?: ReactNode;
};

export function PurchaseLayout({
	title,
	hint,
	notice,
	children,
	bought,
	onBack,
	forward,
}: PurchaseLayoutProps) {
	const { t } = useTranslate();

	return (
		<div className={styles.flow}>
			<Flex vertical gap={32} className={styles.content}>
				{(title || hint) && (
					<Flex vertical gap={8}>
						{title && (
							<Typography.Title level={2} className={styles.title}>
								{title}
							</Typography.Title>
						)}
						{hint && (
							<Typography.Text className={styles.hint}>{hint}</Typography.Text>
						)}
					</Flex>
				)}

				{notice}

				<Flex vertical gap={32} className={styles.answer}>
					{children}
				</Flex>
			</Flex>

			{(onBack || forward || !bought) && (
				<footer className={styles.foot}>
					<Flex gap={8}>
						{onBack && (
							<Button onClick={onBack}>
								{t("checkpoints.prepare.back", "Back")}
							</Button>
						)}
						{forward}
					</Flex>
					{!bought && (
						<Typography.Text className={styles.saved}>
							{t("checkpoints.prepare.saved", "Saved as a draft")}
						</Typography.Text>
					)}
				</footer>
			)}
		</div>
	);
}
