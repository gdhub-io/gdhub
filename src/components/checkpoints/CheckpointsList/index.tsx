"use client";

import { IconFlag, IconPlus } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Flex, Skeleton, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAccess } from "@/components/access/AccessProvider";
import ModernTable from "@/components/ModernTable";
import { EmptyState, SectionHeading } from "@/components/ui";
import {
	useCheckpoints,
	useCreateCheckpoint,
	useDiscardCheckpoint,
} from "@/hooks/checkpoints";
import { useCurrentProject } from "@/hooks/project";
import type { CheckpointDto } from "@/types/checkpoints";
import { CheckpointCard } from "../CheckpointCard";
import { CuratorBadge } from "../CuratorBadge";
import { VerdictChip } from "../VerdictChip";
import styles from "./style.module.scss";

const PAGE_SIZE = 10;

export function CheckpointsList() {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const router = useRouter();
	const { project } = useCurrentProject();
	const { can } = useAccess();
	const [page, setPage] = useState(1);

	const { data, isLoading } = useCheckpoints(project?.id, page);
	const createCheckpoint = useCreateCheckpoint(project?.id);
	const discardCheckpoint = useDiscardCheckpoint();

	const mayCreate = can("project.checkpoints.create");

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
						? `${dayjs(row.startedAt).format("D MMM")} – ${dayjs(row.dueAt).format("D MMM YY")}`
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

	const startCheckpoint = async () => {
		if (!project?.id) return;

		try {
			const checkpoint = await createCheckpoint.mutateAsync();
			router.push(`/user/project/${project.slug}/checkpoints/${checkpoint.id}`);
		} catch {
			message.error(
				t("checkpoints.start.failed", "The checkpoint could not be started"),
			);
		}
	};

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

	if (isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;

	const blocker = data?.blocker;
	const blockedUntil =
		blocker?.reason === "checkpointOpen" && blocker.checkpoint.dueAt
			? dayjs(blocker.checkpoint.dueAt).format("D MMMM")
			: null;

	const startButton = mayCreate ? (
		<Tooltip
			title={
				blockedUntil
					? t(
							"checkpoints.start.disabled",
							"One checkpoint at a time. This one ends {date}.",
							{ date: blockedUntil },
						)
					: blocker?.reason === "noStage"
						? t(
								"checkpoints.start.noStage",
								"The project is not on a workflow stage yet.",
							)
						: undefined
			}
		>
			<Button
				type="primary"
				icon={<IconPlus size={16} />}
				disabled={!data?.canCreate}
				loading={createCheckpoint.isPending}
				onClick={startCheckpoint}
			>
				{t("checkpoints.start", "Start a checkpoint")}
			</Button>
		</Tooltip>
	) : null;

	const hasNothing = !data?.current && data?.closed.total === 0;

	if (hasNothing) {
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
				action={startButton}
			/>
		);
	}

	return (
		<Flex vertical gap={32}>
			{data?.current ? (
				<CheckpointCard
					checkpoint={data.current}
					projectSlug={project?.slug ?? ""}
					onDiscard={discard}
					discarding={discardCheckpoint.isPending}
				/>
			) : (
				<Flex justify="flex-end">{startButton}</Flex>
			)}

			{data && data.closed.total > 0 && (
				<Flex vertical gap={16}>
					<SectionHeading
						level={4}
						title={t("checkpoints.past.title", "Past checkpoints")}
					/>
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
						}}
					/>
				</Flex>
			)}
		</Flex>
	);
}
