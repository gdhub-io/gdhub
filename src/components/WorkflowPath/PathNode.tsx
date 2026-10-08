import {
	IconCheck,
	IconFlag,
	IconSparkles,
	IconVideo,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import styles from "./style.module.scss";

export type PathMarker =
	| "done"
	| "current"
	| "stageDone"
	| "stageCurrent"
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
	stageDone: styles.markerStageDone,
	stageCurrent: styles.markerStageCurrent,
	todo: styles.markerTodo,
	sprint: styles.markerSprint,
	session: styles.markerSession,
	review: styles.markerSession,
	gate: styles.markerGate,
	cleared: styles.markerCleared,
};

// Measured off the frames: a stage head centres at 36, a sprint title at 38.
const OFFSET: Record<PathMarker, 0 | 4 | 6 | 24 | 26 | 28 | 30 | 56 | 64> = {
	done: 24,
	cleared: 4,
	current: 28,
	stageDone: 26,
	stageCurrent: 26,
	todo: 30,
	sprint: 6,
	session: 56,
	review: 56,
	gate: 4,
	none: 0,
};

const SPACE: Record<PathMarker, 0 | 12 | 24 | 32 | 48> = {
	done: 24,
	cleared: 32,
	current: 24,
	stageDone: 24,
	stageCurrent: 24,
	todo: 48,
	sprint: 24,
	session: 48,
	review: 48,
	gate: 48,
	none: 0,
};

const MARKER_ICON: Partial<Record<PathMarker, ReactNode>> = {
	done: <IconCheck size={12} />,
	stageDone: <IconCheck size={12} />,
	session: <IconVideo size={16} />,
	review: <IconSparkles size={16} />,
	gate: <IconFlag size={20} />,
	cleared: <IconFlag size={16} />,
};

export type PathNodeProps = {
	marker: PathMarker;
	/** How the rail runs past this row: walked, ahead, or not at all. */
	rail?: "solid" | "dashed" | "none";
	/** Where the marker sits, when the row's first line is not the usual one. */
	offset?: (typeof OFFSET)[PathMarker];
	/** Space under the row, when it differs from its kind's. */
	space?: (typeof SPACE)[PathMarker];
	/** A row inside the stage — a checkpoint's sprints — sits one step in. */
	inset?: boolean;
	/** The very first stage: the line starts at its marker, not above it. */
	start?: boolean;
	children: ReactNode;
};

/**
 * One row of the path. Rows sit flush so the rail reads as a single line from
 * the first stage to the release; the marker says what the row is.
 */
export function PathNode({
	marker,
	rail = "solid",
	offset = OFFSET[marker],
	space = SPACE[marker],
	inset = false,
	start = false,
	children,
}: PathNodeProps) {
	const railClass = [
		styles.rail,
		rail === "dashed" && styles.railDashed,
		rail === "none" && styles.railNone,
		start && styles.railStart,
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div className={styles.node}>
			<div className={railClass}>
				{marker !== "none" && (
					<span
						className={`${styles.marker} ${MARKER_CLASS[marker]} ${styles[`at${offset}`]}`}
					>
						{MARKER_ICON[marker]}
					</span>
				)}
			</div>
			<div
				className={`${styles.body} ${styles[`space${space}`]}${inset ? ` ${styles.inset}` : ""}`}
			>
				{children}
			</div>
		</div>
	);
}
