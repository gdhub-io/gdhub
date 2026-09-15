"use client";

import { useTranslate } from "@tolgee/react";
import { Button, Flex, Modal, Typography } from "antd";
import type { ReactNode } from "react";
import styles from "./StartLayout.module.scss";

/**
 * The shell every question of the purchase shares (frame `Checkpoint — Page ·
 * Prepare`).
 *
 * Five segments and "Step N of 5" across the top, one question, room to answer
 * it, and a footer bar. No question repeats what an earlier one asked —
 * everything is shown back on the payment question instead.
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

export type StartLayoutProps = {
	step: StartStep;
	question: string;
	hint: string;
	children: ReactNode;
	/** Sits left of the forward button, qualifying what it does. */
	footNote?: ReactNode;
	onBack?: () => void;
	onCancel: () => void;
	forward: ReactNode;
};

export function StartLayout({
	step,
	question,
	hint,
	children,
	footNote,
	onBack,
	onCancel,
	forward,
}: StartLayoutProps) {
	const { t } = useTranslate();
	const index = START_STEPS.indexOf(step);

	const labels: Record<StartStep, string> = {
		now: t("checkpoints.prepare.step.now", "Now"),
		goal: t("checkpoints.prepare.step.goal", "Goal"),
		curator: t("checkpoints.prepare.step.curator", "Curator"),
		planning: t("checkpoints.prepare.step.planning", "Planning"),
		payment: t("checkpoints.prepare.step.payment", "Payment"),
	};

	const confirmCancel = () =>
		Modal.confirm({
			title: t("checkpoints.cancel.title", "Cancel this draft?"),
			content: (
				<Flex vertical gap={8}>
					<span>
						{t(
							"checkpoints.cancel.body",
							"All three steps will be deleted permanently.",
						)}
					</span>
					<Typography.Text type="secondary">
						{t(
							"checkpoints.cancel.leaving",
							"Leaving this page keeps the draft.",
						)}
					</Typography.Text>
				</Flex>
			),
			okText: t("checkpoints.cancel.confirm", "Cancel the draft"),
			cancelText: t("checkpoints.cancel.keep", "Keep the draft"),
			okButtonProps: { danger: true, type: "primary" },
			onOk: onCancel,
		});

	return (
		<div className={styles.flow}>
			<Flex vertical gap={32} className={styles.content}>
				<Flex vertical gap={10}>
					<Flex gap={10}>
						{START_STEPS.map((candidate, position) => (
							<Flex vertical gap={6} key={candidate} className={styles.segment}>
								<span
									className={styles.bar}
									data-reached={position <= index || undefined}
								/>
								<Typography.Text
									className={styles.segmentLabel}
									data-current={position === index || undefined}
								>
									{labels[candidate]}
								</Typography.Text>
							</Flex>
						))}
					</Flex>
					<Typography.Text className={styles.meta}>
						{t("checkpoints.prepare.stepOf", "Step {step} of {total}", {
							step: index + 1,
							total: START_STEPS.length,
						})}
					</Typography.Text>
				</Flex>

				<Flex vertical gap={10}>
					<Typography.Title level={1} className={styles.question}>
						{question}
					</Typography.Title>
					<Typography.Text className={styles.hint}>{hint}</Typography.Text>
				</Flex>

				<div className={styles.answer}>{children}</div>
			</Flex>

			<footer className={styles.foot}>
				<Flex gap={8}>
					{onBack && (
						<Button onClick={onBack}>
							{t("checkpoints.prepare.back", "Back")}
						</Button>
					)}
					<Button onClick={confirmCancel}>
						{t("checkpoints.prepare.cancel", "Cancel")}
					</Button>
				</Flex>
				<Flex gap={12} align="center">
					{footNote}
					{forward}
				</Flex>
			</footer>
		</div>
	);
}
