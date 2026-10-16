import { IconCheck } from "@tabler/icons-react";
import { BOX_TICK_STROKE } from "@/components/ui";
import styles from "./ChecklistStatus.module.scss";

export type ChecklistState = "active" | "done" | "locked";

export type ChecklistStatusProps = {
	state: ChecklistState;
	number: number;
};

/** The 24 circle in front of a hub item: its number, or a tick once it is done. */
export function ChecklistStatus({ state, number }: ChecklistStatusProps) {
	return (
		<span className={styles.status} data-state={state}>
			{state === "done" ? (
				<IconCheck size={14} stroke={BOX_TICK_STROKE} />
			) : (
				number
			)}
		</span>
	);
}
