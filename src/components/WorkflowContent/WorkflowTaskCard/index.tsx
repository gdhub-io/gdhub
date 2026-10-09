import { IconCheck } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Tag } from "antd";
import type React from "react";
import styles from "./style.module.scss";

export type TaskCardProps = {
	label: string;
	description?: string | null;
	required: boolean;
	completed: boolean;
};

/**
 * A single workflow task row. Completion is evaluated by the platform from
 * project data (not toggled by the user), so the checkbox is a read-only
 * status indicator.
 */
const WorkflowTaskCard: React.FC<TaskCardProps> = ({
	label,
	description,
	required,
	completed,
}) => {
	const { t } = useTranslate();

	return (
		<div className={styles.row}>
			<div
				className={`${styles.check} ${completed ? styles.checkDone : ""}`}
				aria-hidden
			>
				{completed && <IconCheck size={12} />}
			</div>
			<div className={styles.texts}>
				<div className={`${styles.label} ${completed ? styles.labelDone : ""}`}>
					{label}
				</div>
				{description && <div className={styles.description}>{description}</div>}
			</div>
			<Tag className={styles.tag}>
				{required
					? t("workflow.tasks.required", "Required")
					: t("workflow.tasks.optional", "Optional")}
			</Tag>
		</div>
	);
};

export default WorkflowTaskCard;
