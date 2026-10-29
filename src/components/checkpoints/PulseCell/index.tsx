import { IconCheck } from "@tabler/icons-react";
import clsx from "clsx";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import { BOX_TICK_STROKE } from "@/components/ui";
import type { CheckpointPulseCellDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

export type PulseCellProps = HTMLAttributes<HTMLSpanElement> & {
	/** Left out where the person has no cell for the sprint at all. */
	state?: CheckpointPulseCellDto["state"];
	/** The sprint the surrounding view is looking at. */
	current?: boolean;
	/** Replaces the glyph the state draws by itself. */
	children?: ReactNode;
	ref?: Ref<HTMLSpanElement>;
};

/**
 * One person's answer for one sprint — the square the team matrix and the
 * public pulse page both draw. Spreads its props so a Tooltip can wrap it.
 */
export function PulseCell({
	state,
	current,
	children,
	className,
	...rest
}: PulseCellProps) {
	const glyph =
		state === "confirmed" ? (
			<IconCheck size={14} stroke={BOX_TICK_STROKE} />
		) : state === "waiting" ? (
			<span className={styles.waitingDot} />
		) : null;

	return (
		<span
			{...rest}
			className={clsx(
				styles.cell,
				state && styles[state],
				current && styles.current,
				className,
			)}
		>
			{children ?? glyph}
		</span>
	);
}
