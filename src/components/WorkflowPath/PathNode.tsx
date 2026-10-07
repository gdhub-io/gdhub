import {
	IconCheck,
	IconFlag,
	IconFlagFilled,
	IconSparkles,
	IconVideo,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import styles from "./style.module.scss";

export type PathMarker =
	| "done"
	| "current"
	| "todo"
	| "sprint"
	| "session"
	| "review"
	| "gate"
	| "cleared"
	| "none";

const MARKER_CLASS: Record<Exclude<PathMarker, "none">, string> = {
	done: styles.markerDone,
	current: styles.markerCurrent,
	todo: styles.markerTodo,
	sprint: styles.markerSprint,
	session: styles.markerSession,
	review: styles.markerSession,
	gate: styles.markerGate,
	cleared: styles.markerCleared,
};

const MARKER_ICON: Partial<Record<PathMarker, ReactNode>> = {
	done: <IconCheck size={14} />,
	session: <IconVideo size={16} />,
	review: <IconSparkles size={16} />,
	gate: <IconFlag size={20} />,
	cleared: <IconFlagFilled size={16} />,
};

export type PathNodeProps = {
	marker: PathMarker;
	/** How the rail runs past this row: walked, ahead, or not at all. */
	rail?: "solid" | "dashed" | "none";
	children: ReactNode;
};

/**
 * One row of the path. Rows sit flush so the rail reads as a single line from
 * the first stage to the release; the marker says what the row is.
 */
export function PathNode({ marker, rail = "solid", children }: PathNodeProps) {
	const railClass = {
		solid: styles.rail,
		dashed: `${styles.rail} ${styles.railDashed}`,
		none: `${styles.rail} ${styles.railNone}`,
	}[rail];

	return (
		<div className={styles.node}>
			<div className={railClass}>
				{marker !== "none" && (
					<span className={`${styles.marker} ${MARKER_CLASS[marker]}`}>
						{MARKER_ICON[marker]}
					</span>
				)}
			</div>
			<div className={styles.body}>{children}</div>
		</div>
	);
}
