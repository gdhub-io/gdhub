"use client";

import { useTranslate } from "@tolgee/react";
import { Button, Flex, Modal, Typography } from "antd";
import { type ReactNode, useEffect, useRef, useState } from "react";
import styles from "./StartLayout.module.scss";

/**
 * The shell every step of the start flow shares (frames `W76sA5`, `pyT9o`).
 *
 * Four segments and "Step N of 4" across the top, one question, room to answer
 * it, and a footer bar. No step repeats what an earlier one asked — everything
 * is shown back on the summary step instead.
 */

export const START_STEPS = ["now", "goal", "curator", "payment"] as const;

export type StartStep = (typeof START_STEPS)[number];

export type StartLayoutProps = {
	step: StartStep;
	/** The stage the checkpoint is being opened on. */
	stageName?: string;
	question: string;
	hint: string;
	children: ReactNode;
	onBack?: () => void;
	onCancel: () => void;
	forward: ReactNode;
};

export function StartLayout({
	step,
	stageName,
	question,
	hint,
	children,
	onBack,
	onCancel,
	forward,
}: StartLayoutProps) {
	const { t } = useTranslate();
	const index = START_STEPS.indexOf(step);

	// The flow runs from wherever it starts to the bottom of the window, so the
	// footer bar sits on the edge of the screen and the answer scrolls under it
	// rather than pushing it away. The chrome above it is the space header, whose
	// height is not a token, so it is measured.
	//
	// Watched rather than measured once: the header is published into the layout
	// from an effect and lands a tick after this mounts, and a single reading
	// taken before it does leaves the page overflowing by exactly its height.
	const flow = useRef<HTMLDivElement>(null);
	const [height, setHeight] = useState<string>();

	useEffect(() => {
		const measure = () => {
			const node = flow.current;
			if (!node) return;

			setHeight(
				`calc(100dvh - ${Math.round(node.getBoundingClientRect().top)}px)`,
			);
		};

		const observer = new ResizeObserver(measure);
		observer.observe(document.body);

		measure();
		// The header lands on the next frame, and the body may not change size
		// when it does, so one more reading after it has settled.
		const frame = requestAnimationFrame(measure);
		window.addEventListener("resize", measure);

		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
			window.removeEventListener("resize", measure);
		};
	}, []);

	const labels: Record<StartStep, string> = {
		now: t("checkpoints.start.step1", "Now"),
		goal: t("checkpoints.start.step2", "Goal"),
		curator: t("checkpoints.start.step3", "Curator"),
		payment: t("checkpoints.start.step4", "Payment"),
	};

	const confirmCancel = () =>
		Modal.confirm({
			title: t("checkpoints.cancel.title", "Cancel this draft?"),
			content: (
				<Flex vertical gap={8}>
					<span>
						{t(
							"checkpoints.cancel.body",
							"Everything written on the three steps goes with it, and nothing on this page can bring it back.",
						)}
					</span>
					<Typography.Text type="secondary">
						{t(
							"checkpoints.cancel.leaving",
							"Closing the tab or walking away does not cancel anything — the draft waits in the checkpoint list.",
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
		<div className={styles.flow} ref={flow} style={{ height }}>
			<Flex vertical gap={32} className={styles.content}>
				<Flex vertical gap={10}>
					{/* The rail says which step; this says what is being built. */}
					<Typography.Text className={styles.kicker}>
						{[t("checkpoints.start.kicker", "New checkpoint"), stageName]
							.filter(Boolean)
							.join(" · ")}
					</Typography.Text>
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
						{t("checkpoints.start.stepMeta", "Step {step} of 4", {
							step: index + 1,
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
							{t("checkpoints.start.back", "Back")}
						</Button>
					)}
					<Button onClick={confirmCancel}>
						{t("checkpoints.start.cancel", "Cancel")}
					</Button>
				</Flex>
				{forward}
			</footer>
		</div>
	);
}
