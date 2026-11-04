import type { ProjectWorkflowStep } from "@gdhub-io/gdhub-prisma";
import {
	type Icon,
	IconArrowRight,
	IconBulb,
	IconChartBar,
	IconChevronDown,
	IconChevronUp,
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
import { Button, Tooltip } from "antd";
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
	/** The step, with its text from the workflow template (GDHUB-97). */
	step: ProjectWorkflowStep & { content?: PrismaJson.EditorJsContent | null };
	title: string;
	state: "done" | "current" | "ahead";
	/** When the project was on it: "12 Mar – 4 Jun", or "since 4 Jun" for the current one. */
	dates?: string | null;
	/** Present only on the current stage, for someone who may move it. */
	next?: {
		onClick: () => void;
		loading: boolean;
		/** Why Next is locked, or null when it is not. */
		lockedReason: string | null;
	};
};

/**
 * A stage of the workflow on the path. Folded it is a name; open it is the
 * stage's text and, on the current one, Next — its tasks live
 * in the aside.
 */
export function StageCard({ step, title, state, dates, next }: StageCardProps) {
	const { t } = useTranslate();
	const [open, setOpen] = useState(false);
	const StageIcon = STAGE_ICONS[Math.min(step.order, STAGE_ICONS.length - 1)];
	// Only the stage the project is on is white, folded or open; the others stay outlined.
	const live = state === "current";

	const eyebrow = {
		ahead: t("workflow.path.stage.next", "Next stage"),
		current: t("workflow.path.stage.current", "Current stage"),
		done: t("workflow.path.stage.previous", "Previous stage"),
	}[state];

	return (
		<div
			className={`${styles.card}${live ? ` ${styles.cardLive}` : ""}${state === "done" ? ` ${styles.cardCompact}` : ""}`}
		>
			{/* ui-guard-ignore the whole header toggles; antd Collapse would restyle the card */}
			<button
				type="button"
				aria-expanded={open}
				className={styles.cardHead}
				onClick={() => setOpen((value) => !value)}
			>
				<IconTile icon={StageIcon} size={state === "done" ? "sm" : "md"} />
				<span className={styles.cardTitles}>
					<span className={styles.overline}>{eyebrow}</span>
					<span className={styles.title}>{title}</span>
				</span>
				{dates && <span className={styles.meta}>{dates}</span>}
				<span className={styles.toggle}>
					{open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
				</span>
			</button>

			{open && (
				<div className={styles.cardBody}>
					<WorkflowStepContent content={step.content} />

					{next && (
						<div>
							<Tooltip title={next.lockedReason}>
								<Button
									type={next.lockedReason ? "default" : "primary"}
									disabled={!!next.lockedReason}
									loading={next.loading}
									onClick={next.onClick}
									icon={
										next.lockedReason ? (
											<IconLock size={16} />
										) : (
											<IconArrowRight size={16} />
										)
									}
									iconPlacement={next.lockedReason ? "start" : "end"}
								>
									{t("workflow.path.stage.next-button", "Next")}
								</Button>
							</Tooltip>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
