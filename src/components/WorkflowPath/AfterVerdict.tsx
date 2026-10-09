import { IconLock } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Modal, Tooltip, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { dayRange } from "@/components/checkpoints/CheckpointCard/SprintTrack";
import {
	useVerdictCopy,
	VerdictChip,
} from "@/components/checkpoints/VerdictChip";
import type { CheckpointDto } from "@/types/checkpoints";
import { CheckpointResult } from "./ClosedCheckpoint";
import { formatShort } from "./dates";
import styles from "./style.module.scss";

export type AfterVerdictProps = {
	checkpoint: CheckpointDto;
	number: number;
	project: { slug: string };
	/** Purchase is not open yet: the way into another checkpoint shows, but is shut. */
	locked?: boolean;
	/** The author goes on with the stage's tasks; the regular offer takes this place. */
	onOwn: () => void;
};

/**
 * Frame 07.6 (`tQa5n`): the verdict just landed, and the author chooses how to
 * go on — another checkpoint, or the stage's own tasks without a curator. The
 * author's notification links here with `?results=<id>`, which opens the
 * results at once.
 */
export function AfterVerdict({
	checkpoint,
	number,
	project,
	locked,
	onOwn,
}: AfterVerdictProps) {
	const { t } = useTranslate();
	const router = useRouter();
	const { meaning } = useVerdictCopy();
	const [results, setResults] = useState(false);

	// Opened once from the link: the parameter goes, so a reload does not reopen it.
	useEffect(() => {
		const url = new URL(window.location.href);
		if (url.searchParams.get("results") !== checkpoint.id) return;
		setResults(true);
		url.searchParams.delete("results");
		window.history.replaceState(null, "", url);
	}, [checkpoint.id]);

	if (!checkpoint.verdict) return null;

	const meta = [
		checkpoint.stageName,
		checkpoint.startedAt && checkpoint.dueAt
			? dayRange(checkpoint.startedAt, checkpoint.dueAt)
			: null,
		checkpoint.decidedAt
			? t("workflow.after.verdictOn", "verdict {date}", {
					date: formatShort(checkpoint.decidedAt),
				})
			: null,
	]
		.filter(Boolean)
		.join(" · ");

	const option = (title: string, body: string, action: React.ReactNode) => (
		<Flex vertical gap={12} align="flex-start" className={styles.afterOption}>
			<Typography.Text strong>{title}</Typography.Text>
			<Typography.Text type="secondary" className={styles.small}>
				{body}
			</Typography.Text>
			{action}
		</Flex>
	);

	return (
		<Flex vertical gap={20} className={`${styles.card} ${styles.cardBody}`}>
			<Flex vertical gap={6}>
				<span className={styles.closedTitle}>
					<span className={styles.title}>
						{t("workflow.path.checkpoint.title", "Checkpoint {number}", {
							number: String(number),
						})}
					</span>
					<VerdictChip verdict={checkpoint.verdict} />
				</span>
				<span className={styles.meta}>{meta}</span>
			</Flex>

			<Flex vertical gap={8}>
				<span className={styles.secondary}>{meaning(checkpoint.verdict)}</span>
				{checkpoint.verdictNote && (
					<span className={styles.prose}>{checkpoint.verdictNote}</span>
				)}
				<Flex justify="space-between" align="center" gap={12} wrap>
					<span className={styles.meta}>
						{checkpoint.curator?.name &&
							t("workflow.after.by", "— {name}, curator", {
								name: checkpoint.curator.name,
							})}
					</span>
					<Button type="link" onClick={() => setResults(true)}>
						{t("workflow.path.check.view-results", "View results")}
					</Button>
				</Flex>
			</Flex>

			<div className={styles.divider} />

			<Flex vertical gap={12}>
				<Typography.Text strong>
					{t("workflow.after.title", "How do you go on?")}
				</Typography.Text>
				<div className={styles.afterOptions}>
					{option(
						t("workflow.after.another", "Another checkpoint"),
						t(
							"workflow.after.anotherBody",
							"28 days with a curator: a goal, four sprints and a verdict at the end.",
						),
						<Tooltip
							title={
								locked && t("workflow.offer.locked", "Checkpoints open soon")
							}
						>
							<Button
								type="primary"
								disabled={locked}
								icon={locked ? <IconLock size={16} /> : undefined}
								onClick={() =>
									router.push(`/user/project/${project.slug}/workflow/cp/new`)
								}
							>
								{t("workflow.after.plan", "Plan Checkpoint {number}", {
									number: String(number + 1),
								})}
							</Button>
						</Tooltip>,
					)}
					{option(
						t("workflow.after.own", "On your own"),
						t(
							"workflow.after.ownBody",
							"Work through the {stage} tasks at your own pace, without a curator.",
							{ stage: checkpoint.stageName },
						),
						<Button onClick={onOwn}>
							{t("workflow.after.continue", "Continue with stage tasks")}
						</Button>,
					)}
				</div>
			</Flex>

			<Modal
				open={results}
				onCancel={() => setResults(false)}
				footer={null}
				title={t("workflow.path.results.title", "Checkpoint {number} results", {
					number: String(number),
				})}
			>
				<div className={styles.result}>
					<CheckpointResult checkpoint={checkpoint} />
				</div>
			</Modal>
		</Flex>
	);
}
