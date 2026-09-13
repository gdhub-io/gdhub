"use client";

import { IconFlag } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Flex, Skeleton, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import ModernTable from "@/components/ModernTable";
import { EmptyState, SectionHeading } from "@/components/ui";
import { useCheckpoints, useDiscardCheckpoint } from "@/hooks/checkpoints";
import { useCurrentProject } from "@/hooks/project";
import type { CheckpointDto } from "@/types/checkpoints";
import { CheckpointCard } from "../CheckpointCard";
import { CuratorBadge } from "../CuratorBadge";
import { StartCheckpointButton } from "../StartCheckpointButton";
import { VerdictChip } from "../VerdictChip";
import styles from "./style.module.scss";

const PAGE_SIZE = 10;

export function CheckpointsList() {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const { project, isLoading: projectLoading } = useCurrentProject();
	const [page, setPage] = useState(1);

	const { data, isPending } = useCheckpoints(project?.id, page);
	const discardCheckpoint = useDiscardCheckpoint();

	const columns: ColumnsType<CheckpointDto> = useMemo(
		() => [
			{
				title: t("checkpoints.past.column.checkpoint", "Checkpoint"),
				key: "checkpoint",
				width: 220,
				render: (_, row) => (
					// The stage gives way; the number never does.
					<Flex gap={4} className={styles.stageCell}>
						<Typography.Text ellipsis>{row.stageName}</Typography.Text>
						<Typography.Text type="secondary" className={styles.number}>
							{`· ${row.order}`}
						</Typography.Text>
					</Flex>
				),
			},
			{
				title: t("checkpoints.past.column.goal", "Goal"),
				dataIndex: "goal",
				key: "goal",
				ellipsis: true,
			},
			{
				title: t("checkpoints.past.column.dates", "Dates"),
				key: "dates",
				width: 150,
				render: (_, row) =>
					row.startedAt && row.dueAt
						? `${dayjs(row.startedAt).format("D MMM")}–${dayjs(row.dueAt).format("D MMM YYYY")}`
						: "—",
			},
			{
				title: t("checkpoints.past.column.verdict", "Verdict"),
				key: "verdict",
				width: 130,
				render: (_, row) =>
					row.verdict ? <VerdictChip verdict={row.verdict} /> : "—",
			},
			{
				title: t("checkpoints.past.column.decidedBy", "Decided by"),
				key: "decidedBy",
				width: 180,
				render: (_, row) => (
					<CuratorBadge kind={row.curatorKind} curator={row.curator} />
				),
			},
		],
		[t],
	);

	const discard = async (id: string) => {
		try {
			await discardCheckpoint.mutateAsync(id);
		} catch {
			message.error(
				t(
					"checkpoints.draft.discardFailed",
					"The draft could not be discarded",
				),
			);
		}
	};

	// `isPending` stays true while the query is disabled, so the empty state
	// cannot flash before the project id has even arrived.
	if (projectLoading || isPending) {
		return <Skeleton active paragraph={{ rows: 6 }} />;
	}

	if (!data?.current && data?.closed.total === 0) {
		return (
			<EmptyState
				icon={IconFlag}
				title={t(
					"checkpoints.empty.title",
					"Your first checkpoint starts here",
				)}
				description={t(
					"checkpoints.empty.description",
					"28 days, one goal, a curator, and a verdict that opens the next stage.",
				)}
				action={
					<StartCheckpointButton
						projectId={project?.id}
						projectSlug={project?.slug}
					/>
				}
			/>
		);
	}

	return (
		<Flex vertical gap={32}>
			{data?.current && (
				<CheckpointCard
					checkpoint={data.current}
					projectSlug={project?.slug ?? ""}
					onDiscard={discard}
					discarding={discardCheckpoint.isPending}
				/>
			)}

			{data && data.closed.total > 0 && (
				<Flex vertical gap={16}>
					<Flex gap={8} align="center">
						<SectionHeading
							level={4}
							title={t("checkpoints.past.title", "Past checkpoints")}
						/>
						<Typography.Text type="secondary">
							{data.closed.total}
						</Typography.Text>
					</Flex>
					<ModernTable<CheckpointDto>
						density="compact"
						rowKey="id"
						columns={columns}
						dataSource={data.closed.rows}
						scroll={{ x: 900 }}
						pagination={{
							current: page,
							pageSize: PAGE_SIZE,
							total: data.closed.total,
							onChange: setPage,
							showSizeChanger: false,
							showTotal: (total) =>
								t("checkpoints.past.total", "{count} closed checkpoints", {
									count: total,
								}),
						}}
					/>
				</Flex>
			)}
		</Flex>
	);
}
