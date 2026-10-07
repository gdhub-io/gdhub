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
	step: ProjectWorkflowStep;
	title: string;
	state: "done" | "current" | "ahead";
	/** When the project was on it: "12 Mar – 4 Jun", or "since 4 Jun" for the current one. */
	dates?: string | null;
	locale?: string;
	/** Opens unfolded: the stage the project is on, when no checkpoint runs on it. */
	defaultOpen?: boolean;
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
 * stage's text from Notion and, on the current one, Next — its tasks live
 * in the aside.
 */
export function StageCard({
	step,
	title,
	state,
	dates,
	defaultOpen = false,
	locale,
	next,
}: StageCardProps) {
	const { t } = useTranslate();
	const [open, setOpen] = useState(defaultOpen);
	const StageIcon =
		STAGE_ICONS[Math.min(step.order, STAGE_ICONS.length - 1)] ?? IconFlag;
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
				{dates && <span className={styles.meta}>{dates}</span>}
				<span className={styles.toggle}>
					{open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
				</span>
			</div>

			{open && (
				<div className={styles.cardBody}>
					<WorkflowStepContent step={step} locale={locale} />

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
