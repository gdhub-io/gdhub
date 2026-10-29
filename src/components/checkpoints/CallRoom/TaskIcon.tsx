"use client";

import { IconCircle, IconCircleCheck } from "@tabler/icons-react";
import type { Task } from "./plan-types";
import styles from "./style.module.scss";

/** Done once an artifact closes it; cut and open tasks share the empty circle. */
export function TaskIcon({ task }: { task: Task }) {
	return task.artifacts.length ? (
		<IconCircleCheck size={16} className={styles.success} />
	) : (
		<IconCircle size={16} className={styles.tertiary} />
	);
}
