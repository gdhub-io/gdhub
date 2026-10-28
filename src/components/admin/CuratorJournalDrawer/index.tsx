"use client";

import { useTranslate } from "@tolgee/react";
import { Descriptions, Drawer, Flex, Skeleton, Tabs, Typography } from "antd";
import { VerdictChip } from "@/components/checkpoints/VerdictChip";
import { formatMoneyCents } from "@/config/checkpoint-pricing";
import { useCuratorJournal } from "@/hooks/admin-checkpoints";
import type { JournalRead } from "@/repositories/evidence-seen";
import type { AdminCheckpointRowDto } from "@/types/checkpoints";
import { Conversation } from "./Conversation";
import { ArtifactsTab, DevlogsTab, InputsTab, PlanTab } from "./Subjects";
import styles from "./style.module.scss";

/** Frames 12.11.10–10h: one checkpoint's curator journal, for admins. */
export function CuratorJournalDrawer({
	checkpoint,
	onClose,
}: {
	checkpoint: AdminCheckpointRowDto;
	onClose: () => void;
}) {
	const { t } = useTranslate();
	const journal = useCuratorJournal(checkpoint.id);
	const view = journal.data;
	const reads = (view?.messages ?? []).flatMap((message) =>
		message.kind === "looked"
			? [(message.source as { input: JournalRead }).input]
			: [],
	);

	return (
		<Drawer
			open
			size={960}
			onClose={onClose}
			title={
				<Flex vertical gap={4}>
					{t("admin.checkpoints.journal.title", "Curator journal")}
					<Typography.Text type="secondary" className={styles.subtitle}>
						{checkpoint.projectName} ·{" "}
						{t("admin.checkpoints.journal.checkpoint", "Checkpoint {number}", {
							number: checkpoint.number,
						})}{" "}
						· {checkpoint.stageName}
					</Typography.Text>
				</Flex>
			}
		>
			{journal.isLoading ? (
				<Skeleton active avatar paragraph={{ rows: 2 }} />
			) : journal.isError || !view ? (
				<Typography.Text type="secondary">
					{t(
						"admin.checkpoints.journal.error",
						"The journal could not be loaded. Close it and open it again.",
					)}
				</Typography.Text>
			) : (
				<Flex vertical gap={16}>
					<Descriptions
						colon={false}
						size="small"
						column={3}
						layout="vertical"
						items={[
							{
								key: "looked",
								label: t("admin.checkpoints.journal.looked", "Looked at"),
								children: t(
									"admin.checkpoints.journal.lookedValue",
									"{links} links · {unread} not read",
									{
										links: reads.length,
										unread: reads.filter((read) => !read?.text && !read?.images)
											.length,
									},
								),
							},
							{
								key: "video",
								label: t("admin.checkpoints.journal.video", "Video watched"),
								children: t(
									"admin.checkpoints.journal.seconds",
									"{seconds} s",
									{
										seconds: Math.round(
											reads.reduce(
												(sum, read) => sum + (read?.videoSeconds ?? 0),
												0,
											),
										),
									},
								),
							},
							{
								key: "spend",
								label: t("admin.checkpoints.journal.spend", "AI spend"),
								children: formatMoneyCents(checkpoint.aiCost),
							},
						]}
					/>
					<Flex vertical gap={4}>
						<Typography.Text type="secondary" className={styles.meta}>
							{t("admin.checkpoints.journal.goal", "Goal")}
						</Typography.Text>
						<Typography.Text strong>{view.plan.goal}</Typography.Text>
					</Flex>
					{view.verdict && (
						<Flex vertical gap={4}>
							<Typography.Text type="secondary" className={styles.meta}>
								{t("admin.checkpoints.journal.verdictHead", "Verdict")}
							</Typography.Text>
							<VerdictChip verdict={view.verdict.verdict} />
							{view.verdict.note && (
								<Typography.Text>{view.verdict.note}</Typography.Text>
							)}
						</Flex>
					)}
					<Tabs
						items={[
							{
								key: "conversation",
								label: t(
									"admin.checkpoints.journal.tab.conversation",
									"Conversation",
								),
								children: <Conversation view={view} />,
							},
							{
								key: "inputs",
								label: t("admin.checkpoints.journal.tab.inputs", "Inputs"),
								children: <InputsTab inputs={view.inputs} />,
							},
							{
								key: "plan",
								label: t("admin.checkpoints.journal.tab.plan", "Plan"),
								children: <PlanTab plan={view.plan} />,
							},
							{
								key: "artifacts",
								label: t(
									"admin.checkpoints.journal.tab.artifacts",
									"Artifacts",
								),
								children: <ArtifactsTab artifacts={view.artifacts} />,
							},
							{
								key: "devlogs",
								label: t("admin.checkpoints.journal.tab.devlogs", "Devlogs"),
								children: <DevlogsTab devlogs={view.devlogs} />,
							},
						]}
					/>
				</Flex>
			)}
		</Drawer>
	);
}
