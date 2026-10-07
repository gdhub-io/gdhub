import type {
	ProjectWorkflowStep,
	ProjectWorkflowTask,
} from "@gdhub-io/gdhub-prisma";
import {
	type Icon,
	IconArrowRight,
	IconBulb,
	IconChartBar,
	IconChevronDown,
	IconChevronUp,
	IconCircle,
	IconCircleCheckFilled,
	IconDeviceGamepad2,
	IconDoor,
	IconFlag,
	IconLifebuoy,
	IconLock,
	IconRocket,
	IconShape,
	IconTestPipe,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Tag, Tooltip } from "antd";
import { useState } from "react";
import { IconTile } from "@/components/ui";
import WorkflowStepContent from "@/components/WorkflowContent/WorkflowStepContent";
import styles from "./style.module.scss";

// The default workflow's nine stages, in order; a longer custom one repeats the last.
const STAGE_ICONS: Icon[] = [
	IconDoor,
	IconBulb,
	IconShape,
	IconTestPipe,
	IconDeviceGamepad2,
	IconChartBar,
	IconRocket,
	IconLifebuoy,
	IconFlag,
];

export type StageCardProps = {
	step: ProjectWorkflowStep;
	title: string;
	state: "done" | "current" | "ahead";
	locale?: string;
	/** The current stage's tasks; the API carries no others. */
	tasks?: ProjectWorkflowTask[];
	/** Present only on the current stage, for someone who may move it. */
	next?: {
		onClick: () => void;
		loading: boolean;
		/** Why Next is locked, or null when it is not. */
		lockedReason: string | null;
	};
	/** A checkpoint running on this stage takes the page; the stage folds away. */
	defaultOpen?: boolean;
};

/**
 * A stage of the workflow on the path. Folded it is a name; open it is the
 * stage's text from Notion, its tasks and, on the current one, Next.
 */
export function StageCard({
	step,
	title,
	state,
	locale,
	tasks,
	next,
	defaultOpen = false,
}: StageCardProps) {
	const { t } = useTranslate();
	const [open, setOpen] = useState(defaultOpen);
	const StageIcon =
		STAGE_ICONS[Math.min(step.order, STAGE_ICONS.length - 1)] ?? IconFlag;
	const done = (tasks ?? []).filter((task) => task.done).length;
	// Only the stage the project is on is white; one behind or ahead stays outlined, open or not.
	const live = state === "current" && open;

	const eyebrow = {
		ahead: t("workflow.path.stage.next", "Next stage"),
		current: t("workflow.path.stage.current", "Current stage"),
		done: t("workflow.path.stage.label", "Stage"),
	}[state];

	return (
		<div className={`${styles.card}${live ? ` ${styles.cardLive}` : ""}`}>
			{/* ui-guard-ignore the whole header toggles; antd Collapse would restyle the card */}
			<div
				role="button"
				tabIndex={0}
				aria-expanded={open}
				className={styles.cardHead}
				onClick={() => setOpen((value) => !value)}
				onKeyDown={(event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						setOpen((value) => !value);
					}
				}}
			>
				<IconTile icon={StageIcon} size="md" />
				<div className={styles.cardTitles}>
					<span className={styles.overline}>{eyebrow}</span>
					<span className={styles.title}>{title}</span>
				</div>
				<span className={styles.toggle}>
					{open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
				</span>
			</div>

			{open && (
				<div className={styles.cardBody}>
					<WorkflowStepContent step={step} locale={locale} />

					{!!tasks?.length && (
						<div className={styles.section}>
							<div className={styles.sectionHead}>
								<span className={styles.sectionLabel}>
									{t("workflow.path.stage.tasks", "Tasks")}
								</span>
								<span>
									{t("workflow.path.count", "{done} of {total}", {
										done: String(done),
										total: String(tasks.length),
									})}
								</span>
							</div>
							{tasks.map((task) => (
								<div key={task.id} className={styles.taskRow}>
									{task.done ? (
										<IconCircleCheckFilled
											size={16}
											className={styles.taskIconDone}
										/>
									) : (
										<IconCircle size={16} className={styles.taskIcon} />
									)}
									<span
										className={`${styles.grow} ${task.done ? styles.secondary : styles.taskLabel}`}
									>
										{task.name || task.description}
									</span>
									{task.required && (
										<Tag variant="filled">
											{t("workflow.path.stage.required", "Required")}
										</Tag>
									)}
								</div>
							))}
						</div>
					)}

					{next && (
						<div>
							{next.lockedReason ? (
								<Tooltip title={next.lockedReason}>
									<Button disabled icon={<IconLock size={16} />}>
										{t("workflow.path.stage.next-button", "Next")}
									</Button>
								</Tooltip>
							) : (
								<Button
									type="primary"
									loading={next.loading}
									onClick={next.onClick}
									icon={<IconArrowRight size={16} />}
									iconPlacement="end"
								>
									{t("workflow.path.stage.next-button", "Next")}
								</Button>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
