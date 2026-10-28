import { useTranslate } from "@tolgee/react";
import { Typography } from "antd";
import { AsideHead } from "@/components/WorkflowPath/AsideHead";
import WorkflowTaskCard from "../WorkflowTaskCard";
import styles from "./style.module.scss";

const { Text } = Typography;

export type WorkflowTaskItem = {
	id: string;
	label: string;
	description?: string | null;
	required: boolean;
	done: boolean;
};

export type WorkflowTasksPanelProps = {
	tasks: WorkflowTaskItem[];
	/** Show the "required tasks unlock the next step" caption below the panel. */
	showHint?: boolean;
	/** The stage's name, over "Stage tasks". */
	stageName?: string;
};

/**
 * Read-only tasks sidebar for a workflow step. Completion is evaluated by the
 * platform from project data, so rows are status indicators, not inputs.
 */
const WorkflowTasksPanel = ({
	tasks,
	showHint = true,
	stageName,
}: WorkflowTasksPanelProps) => {
	const { t } = useTranslate();

	if (tasks.length === 0) return null;

	return (
		<div className={styles.wrapper}>
			<div className={styles.panel}>
				<AsideHead
					title={stageName ?? t("workflow.tasks.stageTitle", "Stage tasks")}
					sub={stageName && t("workflow.tasks.stageTitle", "Stage tasks")}
				/>
				<div className={styles.rows}>
					{tasks.map((task) => (
						<WorkflowTaskCard
							key={task.id}
							label={task.label}
							description={task.description}
							required={task.required}
							completed={task.done}
						/>
					))}
				</div>
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
