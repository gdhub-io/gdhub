"use client";

import { IconAlertTriangle, IconFlag } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Flex, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import ModernTable from "@/components/ModernTable";
import { EmptyState, SectionHeading } from "@/components/ui";
import { CheckpointStatus } from "@/config/prisma-enums";
import { useCheckpoints, useDiscardCheckpoint } from "@/hooks/checkpoints";
import { useCurrentProject } from "@/hooks/project";
import type { CheckpointDto } from "@/types/checkpoints";
import { CheckpointCard } from "../CheckpointCard";
import { CheckpointsSkeleton } from "../CheckpointsSkeleton";
import { CuratorBadge } from "../CuratorBadge";
import { DraftCard } from "../DraftCard";
import { StartCheckpointButton } from "../StartCheckpointButton";
import { VerdictChip } from "../VerdictChip";
import styles from "./style.module.scss";

const PAGE_SIZE = 10;

export function CheckpointsList() {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const { project, isLoading: projectLoading } = useCurrentProject();
	const [page, setPage] = useState(1);

	const { data, isPending, isError, refetch, isFetching } = useCheckpoints(
		project?.id,
		page,
	);
	const discardCheckpoint = useDiscardCheckpoint();

	const columns: ColumnsType<CheckpointDto> = useMemo(
		() => [
			{
				// The number runs through the project, not through the stage, so it
				// names the row on its own and the stage is context beside it.
				title: t("checkpoints.past.column.checkpoint", "Checkpoint"),
				key: "checkpoint",
				width: 120,
				render: (_, row) => (
					<Typography.Text className={styles.number}>
						{t("checkpoints.number", "Checkpoint {number}", {
							number: row.order,
						})}
					</Typography.Text>
				),
			},
			{
				title: t("checkpoints.past.column.stage", "Stage"),
				key: "stage",
				width: 220,
				render: (_, row) => (
					<Flex className={styles.stageCell}>
						<Typography.Text type="secondary" ellipsis>
							{row.stageName}
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
		return <CheckpointsSkeleton />;
	}

	// The page head stays as it is and only the list becomes one panel: the tab
	// is still navigable, and the one thing that failed says so (frame `O0tgre`).
	if (isError) {
		return (
			<div className={styles.error}>
				<EmptyState
					icon={IconAlertTriangle}
					tint="var(--gd-danger-tint)"
					ink="var(--gd-danger-solid)"
					description={t(
						"checkpoints.error.title",
						"Checkpoints could not be loaded",
					)}
					action={
						<Button
							type="primary"
							loading={isFetching}
							onClick={() => refetch()}
						>
							{t("checkpoints.error.retry", "Try again")}
						</Button>
					}
				/>
			</div>
		);
	}

	if (!data?.current && data?.closed.total === 0) {
		return (
			<EmptyState
				icon={IconFlag}
				description={t(
					"checkpoints.empty.title",
					"Your first checkpoint starts here",
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
			{data?.current &&
				(data.current.status === CheckpointStatus.Draft ? (
					<DraftCard
						checkpoint={data.current}
						projectSlug={project?.slug ?? ""}
						onDiscard={discard}
						discarding={discardCheckpoint.isPending}
					/>
				) : (
					<CheckpointCard
						checkpoint={data.current}
						projectSlug={project?.slug ?? ""}
					/>
				))}

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
						scroll={{ x: 1000 }}
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
