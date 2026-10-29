"use client";

import { IconPaperclip } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Tooltip, Typography } from "antd";
import type { EvidenceActions } from "@/components/checkpoints/AttachEvidenceModal/useEvidencePicker";
import { ArtifactLinks } from "@/components/WorkflowPath/ArtifactLink";
import { canTakeEvidence } from "@/lib/checkpoints/verdict";
import { Field } from "./Field";
import type { Plan } from "./plan-types";
import styles from "./style.module.scss";
import { TaskIcon } from "./TaskIcon";

/** Read-only: another call than this one, and anyone on the team but the author. */
export function PlanView({
	plan,
	evidence,
}: {
	plan: Plan;
	evidence?: EvidenceActions;
}) {
	const { t } = useTranslate();
	const kept = plan.tasks.filter((task) => !task.cut);
	const done = kept.filter((task) => task.artifacts.length).length;

	return (
		<Field
			label={t("checkpoints.call.plan.tasks", "Tasks")}
			extra={
				kept.length
					? t("checkpoints.call.plan.doneCount", "{done} of {total} done", {
							done,
							total: kept.length,
						})
					: undefined
			}
		>
			{plan.tasks.length ? (
				<div className={styles.planList}>
					{plan.tasks.map((task) => (
						<div key={task.id} className={styles.taskLine}>
							<TaskIcon task={task} />
							<Typography.Text
								delete={task.cut}
								type={
									task.cut || task.artifacts.length ? "secondary" : undefined
								}
								className={styles.grow}
							>
								{task.text}
							</Typography.Text>
							{task.artifacts.length > 0 && (
								<ArtifactLinks
									artifacts={task.artifacts}
									onDetach={
										evidence &&
										((artifactId) => evidence.detach(artifactId, task.id))
									}
								/>
							)}
							{evidence &&
								!task.cut &&
								canTakeEvidence(task.artifacts.map(({ id }) => id)) && (
									<Tooltip
										title={t("workflow.aside.attach", "Attach an artifact")}
									>
										<Button
											type="text"
											size="small"
											icon={<IconPaperclip size={16} />}
											aria-label={t(
												"workflow.aside.attach",
												"Attach an artifact",
											)}
											onClick={() => evidence.attach(task.id)}
										/>
									</Tooltip>
								)}
						</div>
					))}
				</div>
			) : (
				<Typography.Text type="secondary">
					{t("checkpoints.call.plan.noTasks", "No tasks yet.")}
				</Typography.Text>
			)}
		</Field>
	);
}
