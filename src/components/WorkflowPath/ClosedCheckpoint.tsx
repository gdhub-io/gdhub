import {
	IconArrowUpRight,
	IconChevronDown,
	IconChevronUp,
	IconCircle,
	IconCircleCheck,
	IconCircleX,
	IconSparkles,
	IconVideo,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Divider } from "antd";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { dayRange } from "@/components/checkpoints/CheckpointCard/SprintTrack";
import { CheckpointRating } from "@/components/checkpoints/CheckpointRating";
import {
	useVerdictCopy,
	VerdictChip,
} from "@/components/checkpoints/VerdictChip";
import { StatusDot, type StatusDotProps } from "@/components/ui";
import { AppAvatar } from "@/components/ui/AppAvatar";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
} from "@/config/prisma-enums";
import { sessionHeld } from "@/lib/checkpoint-call";
import { standingOf } from "@/lib/checkpoint-verdict";
import type { CheckpointDto, CheckpointItemDto } from "@/types/checkpoints";
import { ArtifactLink } from "./ArtifactLink";
import { formatShort } from "./dates";
import styles from "./style.module.scss";

export type ClosedCheckpointProps = {
	checkpoint: CheckpointDto;
	number: number;
	projectSlug: string;
};

/**
 * Frame 07.1 (nBVNK): a checkpoint behind the project — its dates and verdict
 * folded, its goal, what was delivered and the curator's word open.
 */
export function ClosedCheckpoint({
	checkpoint,
	number,
	projectSlug,
}: ClosedCheckpointProps) {
	const { t } = useTranslate();
	const [open, setOpen] = useState(false);

	return (
		<div className={styles.closedCard}>
			{/* ui-guard-ignore the header row toggles the details below it */}
			<button
				type="button"
				aria-expanded={open}
				className={styles.closedHead}
				onClick={() => setOpen((value) => !value)}
			>
				<span className={styles.cardTitles}>
					{checkpoint.startedAt && checkpoint.dueAt && (
						<span className={styles.closedDates}>
							{dayRange(checkpoint.startedAt, checkpoint.dueAt)}
						</span>
					)}
					<span className={styles.closedTitle}>
						<span className={styles.closedName}>
							{t("workflow.path.checkpoint.title", "Checkpoint {number}", {
								number: String(number),
							})}
						</span>
						{checkpoint.verdict && <VerdictChip verdict={checkpoint.verdict} />}
					</span>
				</span>
				<span className={styles.toggle}>
					{open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
				</span>
			</button>

			{open && (
				<div className={styles.panel}>
					<CheckpointResult
						checkpoint={checkpoint}
						sessions={
							<HeldSessions
								checkpoint={checkpoint}
								href={(index) =>
									`/user/project/${projectSlug}/workflow/cp${number}/review/${index}`
								}
							/>
						}
					/>
				</div>
			)}
		</div>
	);
}

/** Frame 07.1: the calls or reviews held, each a line linking to its Curator's Review. */
function HeldSessions({
	checkpoint,
	href,
}: {
	checkpoint: CheckpointDto;
	href: (index: number) => string;
}) {
	const { t } = useTranslate();
	const isAI = checkpoint.curatorKind === CheckpointCuratorKind.AI;
	const held = (checkpoint.sessions ?? []).filter((session) =>
		sessionHeld(session, checkpoint.curatorKind),
	);
	if (!held.length) return null;

	const name = checkpoint.curator?.name?.split(" ")[0] ?? "";
	const last = checkpoint.sessions?.at(-1)?.index;
	const title = (index: number) => {
		if (isAI) {
			return index === 1
				? t("workflow.path.session.ai-start", "Set the tasks")
				: t("workflow.path.session.review-title", "Sprint {number} review", {
						number: String(index - 1),
					});
		}
		return index === last
			? t("workflow.path.session.final-with", "Final review with {name}", {
					name,
				})
			: t("workflow.path.session.with", "Session with {name}", { name });
	};

	return (
		<div className={styles.block}>
			<div className={styles.sectionHead}>
				<span className={styles.sectionLabel}>
					{t("workflow.path.checkpoint.sessions", "Sessions")}
				</span>
				<span>
					{t("workflow.path.checkpoint.sessions-held", "{count} held", {
						count: String(held.length),
					})}
				</span>
			</div>
			{held.map((session) => (
				<div key={session.index} className={styles.outcome}>
					{isAI ? (
						<IconSparkles size={16} className={styles.taskIcon} />
					) : (
						<IconVideo size={16} className={styles.taskIcon} />
					)}
					<span>{title(session.index)}</span>
					<span className={`${styles.meta} ${styles.grow}`}>
						{formatShort(session.scheduledAt)}
					</span>
					<Link href={href(session.index)} className={styles.link}>
						{isAI
							? t("workflow.path.session.review", "Review")
							: t("workflow.path.session.notes", "Notes")}
						<IconArrowUpRight size={14} />
					</Link>
				</div>
			))}
		</div>
	);
}

/**
 * How each task's evidence counted. The AI curator's verdict is settled by
 * `standingOf`, so its labels come from the same rule (GDHUB-81, frame
 * 12.07.4); a human curator judges evidence himself and gets no labels.
 */
function useEvidenceStanding(checkpoint: CheckpointDto) {
	const { t } = useTranslate();
	const isAI = checkpoint.curatorKind === CheckpointCuratorKind.AI;

	return (
		item: CheckpointItemDto,
	): { failed: boolean; status?: StatusDotProps } => {
		if (!isAI) return { failed: !item.artifact };

		const standing = standingOf(item);
		switch (standing.is) {
			case "unproven":
				if (standing.reason === "missing") return { failed: true };
				return {
					failed: true,
					status: {
						tone: "danger",
						label:
							standing.reason === "broken"
								? t(
										"workflow.path.checkpoint.evidence.broken",
										"Link doesn't open",
									)
								: t(
										"workflow.path.checkpoint.evidence.doesNotMatch",
										"Not about the task",
									),
					},
				};
			case "trusted":
				return {
					failed: false,
					status: {
						tone: "warning",
						label: t("workflow.path.checkpoint.evidence.trusted", "On trust"),
					},
				};
			case "partly":
				return {
					failed: false,
					status: {
						tone: "warning",
						label: t("workflow.path.checkpoint.evidence.partly", "Partly"),
					},
				};
			default:
				return { failed: false };
		}
	};
}

/** What a closed checkpoint came to: the goal, what was delivered, the verdict. */
export function CheckpointResult({
	checkpoint,
	rateable = false,
	sessions,
}: {
	checkpoint: CheckpointDto;
	/** The results modal is the one place the rating is asked. */
	rateable?: boolean;
	/** Between the tasks and the verdict; only the closed card on the path has it. */
	sessions?: ReactNode;
}) {
	const { t } = useTranslate();
	const { meaning } = useVerdictCopy();
	const outcomes = checkpoint.items.filter(
		(item) => item.kind === CheckpointItemKind.Outcome && !item.cut,
	);
	const evidence = useEvidenceStanding(checkpoint);
	const rows = outcomes.map((item) => ({ item, ...evidence(item) }));
	const delivered = rows.filter((row) => !row.failed).length;

	return (
		<>
			<div className={styles.block}>
				<span className={styles.overline}>
					{t("workflow.path.checkpoint.goal", "Goal")}
				</span>
				<span className={styles.prose}>{checkpoint.goal}</span>
			</div>

			{outcomes.length > 0 && (
				<div className={styles.block}>
					<div className={styles.sectionHead}>
						<span className={styles.sectionLabel}>
							{t("workflow.path.checkpoint.tasks", "Tasks")}
						</span>
						<span>
							{t("workflow.path.count", "{done} of {total}", {
								done: String(delivered),
								total: String(outcomes.length),
							})}
						</span>
					</div>
					{rows.map(({ item, failed, status }) => {
						return (
							<div key={item.id} className={styles.outcome}>
								{!item.artifact ? (
									<IconCircle size={16} className={styles.taskIcon} />
								) : failed ? (
									<IconCircleX size={16} className={styles.taskIconFailed} />
								) : (
									<IconCircleCheck size={16} className={styles.taskIconDone} />
								)}
								<span
									className={`${styles.grow}${item.artifact ? "" : ` ${styles.secondary}`}`}
								>
									{item.text}
								</span>
								{status && <StatusDot {...status} />}
								{item.artifact ? (
									<ArtifactLink artifact={item.artifact} />
								) : (
									<span className={styles.tertiary}>
										{t(
											"workflow.path.checkpoint.not-delivered",
											"Not delivered",
										)}
									</span>
								)}
							</div>
						);
					})}
				</div>
			)}

			{sessions}

			{checkpoint.verdict && (
				<>
					<Divider className={styles.divider} />
					<div className={styles.block}>
						<span className={styles.closedTitle}>
							<VerdictChip verdict={checkpoint.verdict} />
							{checkpoint.decidedAt && (
								<span className={styles.meta}>
									· {formatShort(checkpoint.decidedAt)}
								</span>
							)}
						</span>
						<span className={styles.secondary}>
							{meaning(checkpoint.verdict)}
						</span>
						{checkpoint.verdictNote && (
							<span className={styles.prose}>{checkpoint.verdictNote}</span>
						)}
						{checkpoint.curator && (
							<span className={styles.closedTitle}>
								<AppAvatar src={checkpoint.curator.image} size={24}>
									{checkpoint.curator.name?.[0]}
								</AppAvatar>
								<span className={styles.meta}>{checkpoint.curator.name}</span>
							</span>
						)}
					</div>
					{rateable && <CheckpointRating checkpointId={checkpoint.id} />}
				</>
			)}
		</>
	);
}
