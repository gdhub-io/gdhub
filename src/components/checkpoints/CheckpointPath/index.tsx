"use client";

import { IconCheck, IconFlag, IconLock } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Tooltip, Typography } from "antd";
import clsx from "clsx";
import styles from "./style.module.scss";

export type PathGlyph = "start" | "done" | "current" | "ahead" | "locked";

export type PathStepView = {
	key: string;
	label: string;
	meta?: string | null;
	glyph: PathGlyph;
	/** A dot at the edge: this step wants something from the author. */
	needsYou?: boolean;
};

export type CheckpointPathProps = {
	steps: PathStepView[];
	selected: string;
	onSelect: (key: string) => void;
	/** The way out of this checkpoint and into the next one, once there is a verdict. */
	next?: { disabled: boolean; reason?: string; onClick?: () => void };
	footNote?: string | null;
	className?: string;
};

/**
 * The 28 days as a path — frame `Checkpoint — Page · a sprint (Status)`, sidebar.
 *
 * Hand-rolled rather than an antd `Menu` because every row carries a state glyph,
 * its dates and an attention dot; a menu item is one line of text. The dates live
 * here and nowhere else on the page, so this is also the only place they are
 * formatted.
 */
export function CheckpointPath({
	steps,
	selected,
	onSelect,
	next,
	footNote,
	className,
}: CheckpointPathProps) {
	const { t } = useTranslate();

	return (
		<nav
			className={clsx(styles.path, className)}
			aria-label={t("checkpoints.path.label", "Path to checkpoint")}
		>
			<Typography.Text className={styles.label}>
				{t("checkpoints.path.label", "Path to checkpoint")}
			</Typography.Text>

			{steps.map((step) => (
				<button
					key={step.key}
					type="button"
					aria-current={step.key === selected}
					className={clsx(
						styles.step,
						step.key === selected && styles.selected,
					)}
					onClick={() => onSelect(step.key)}
				>
					<span className={clsx(styles.glyph, styles[step.glyph])}>
						{step.glyph === "done" && <IconCheck size={13} stroke={2.4} />}
						{step.glyph === "start" && <IconFlag size={13} />}
						{step.glyph === "locked" && <IconLock size={12} />}
						{step.glyph === "current" && <span className={styles.dot} />}
					</span>

					<span className={styles.text}>
						<span className={styles.name}>{step.label}</span>
						{!!step.meta && <span className={styles.meta}>{step.meta}</span>}
					</span>

					{step.needsYou && <span className={styles.needsYou} />}
				</button>
			))}

			{next && (
				<div className={styles.next}>
					<Tooltip title={next.disabled ? next.reason : undefined}>
						<Button
							block
							disabled={next.disabled}
							icon={next.disabled ? <IconLock size={14} /> : undefined}
							onClick={next.onClick}
						>
							{t("checkpoints.next.cta", "Next checkpoint")}
						</Button>
					</Tooltip>
				</div>
			)}

			{!!footNote && (
				<Typography.Text className={styles.footNote}>
					{footNote}
				</Typography.Text>
			)}
		</nav>
	);
}
