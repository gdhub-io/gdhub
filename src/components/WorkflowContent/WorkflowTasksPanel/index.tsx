import { useTranslate } from "@tolgee/react";
import { Typography } from "antd";
import WorkflowTaskCard from "../WorkflowTaskCard";
import styles from "./style.module.scss";

const { Text } = Typography;

export type WorkflowTaskItem = {
	id: string;
	label: string;
	description?: string | null;
	required: boolean;
	done: boolean;
	/** A checkpoint's task: it carries a deadline, not a place in the stage gate. */
	due?: { label: string; overdue: boolean };
};

export type WorkflowTasksPanelProps = {
	tasks: WorkflowTaskItem[];
	/** Show the "required tasks unlock the next step" caption below the panel. */
	showHint?: boolean;
};

/**
 * Read-only tasks sidebar for a workflow step. Completion is evaluated by the
 * platform from project data, so rows are status indicators, not inputs.
 */
const WorkflowTasksPanel = ({
	tasks,
	showHint = true,
}: WorkflowTasksPanelProps) => {
	const { t } = useTranslate();

	if (tasks.length === 0) return null;

	// The gate counts the stage's own tasks; a checkpoint's are not part of it.
	const requiredTasks = tasks.filter((task) => task.required && !task.due);
	const doneRequiredCount = requiredTasks.filter((task) => task.done).length;

	return (
		<div className={styles.wrapper}>
			<div className={styles.panel}>
				<div className={styles.header}>
					<span className={styles.title}>
						{t("workflow.tasks.title", "Tasks")}
					</span>
					{requiredTasks.length > 0 && (
						<span className={styles.progress}>
							{t(
								"workflow.tasks.required-progress",
								"{done} of {total} required",
								{
									done: doneRequiredCount.toString(),
									total: requiredTasks.length.toString(),
								},
							)}
						</span>
					)}
				</div>
				{tasks.map((task) => (
					<WorkflowTaskCard
						key={task.id}
						label={task.label}
						description={task.description}
						required={task.required}
						completed={task.done}
						due={task.due}
					/>
				))}
			</div>
			{showHint && (
				<Text type="secondary" className={styles.hint}>
					{t(
						"workflow.tasks.gate-hint",
						"Required tasks unlock the next step. Optional ones can be skipped.",
					)}
				</Text>
			)}
		</div>
	);
};

export default WorkflowTasksPanel;
