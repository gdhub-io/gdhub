"use client";

import {
	IconArrowRight,
	IconArrowUp,
	IconCircleDashed,
	IconFlag,
	IconRefresh,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Collapse, Flex, Skeleton, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { useDirectionLabel } from "@/components/checkpoints/SprintDirection";
import { VerdictChip } from "@/components/checkpoints/VerdictChip";
import SpecialistPreviewModal from "@/components/modals/SpecialistPreviewModal";
import { StatusDot } from "@/components/ui";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { skillLevelsList } from "@/components/ui/skillLevel";
import { AI_CURATOR_AVATAR, type Direction } from "@/config/checkpoint";
import type { DirectionRead } from "@/types/checkpoints";
import styles from "../style.module.scss";
import type { CardCheckpoint } from "../types";
import { useCardSection } from "../useSection";

const { Text, Paragraph } = Typography;

const DATE = "D MMM YYYY";

const HEADING: Record<Direction, typeof IconArrowRight> = {
	toward: IconArrowRight,
	sideways: IconArrowUp,
	stalled: IconRefresh,
	idle: IconCircleDashed,
};

/** Frames 09.07.7 (`YU95z`) and 09.07.8 (`tMdco`): the project's checkpoints, newest first. */
export function CheckpointsTab({ projectId }: { projectId: string }) {
	const { t } = useTranslate();
	const [talent, setTalent] = useState<string>();
	const { data, isLoading } = useCardSection<CardCheckpoint[]>(
		projectId,
		"checkpoints",
	);

	if (isLoading)
		return <Skeleton active title={false} paragraph={{ rows: 6 }} />;

	if (!data?.length) {
		return (
			<Text type="secondary">
				{t("scout.card.checkpoints.empty", "No checkpoints yet.")}
			</Text>
		);
	}

	return (
		<Flex vertical gap={12}>
			<Text type="secondary">
				{t(
					"scout.card.checkpoints.lead",
					"Each checkpoint, as its curator judged it. Newest first.",
				)}
			</Text>
			<Collapse
				className={styles.checkpoints}
				items={data.map((checkpoint) => ({
					key: checkpoint.id,
					collapsible: checkpoint.running ? "disabled" : undefined,
					showArrow: !checkpoint.running,
					label: (
						<CheckpointHead checkpoint={checkpoint} onCurator={setTalent} />
					),
					children: checkpoint.running ? null : (
						<VerdictDetails checkpoint={checkpoint} />
					),
				}))}
			/>
			<SpecialistPreviewModal
				open={!!talent}
				specialistId={talent}
				withOffer={false}
				onCancel={() => setTalent(undefined)}
			/>
		</Flex>
	);
}

function CheckpointHead({
	checkpoint,
	onCurator,
}: {
	checkpoint: CardCheckpoint;
	onCurator: (specialityId: string) => void;
}) {
	const { t } = useTranslate();
	const start = checkpoint.startedAt
		? dayjs(checkpoint.startedAt).format(DATE)
		: null;
	const when = checkpoint.running
		? t("scout.card.checkpoints.running", "from {start} · day {day} of 28", {
				start: start ?? "—",
				day: String(checkpoint.day ?? 1),
			})
		: [start, checkpoint.dueAt && dayjs(checkpoint.dueAt).format(DATE)]
				.filter(Boolean)
				.join(" – ");

	return (
		<Flex gap={16} align="flex-start" className={styles.checkpointHead}>
			<Flex vertical gap={2} flex={1} className={styles.min0}>
				<Text strong>{checkpoint.goal}</Text>
				<Text type="secondary" className={styles.cpMeta}>
					{t("scout.card.checkpoints.meta", "Checkpoint {number} · {stage}", {
						number: String(checkpoint.number),
						stage: checkpoint.stage,
					})}
					{when && ` · ${when}`}
				</Text>
			</Flex>
			{checkpoint.verdict ? (
				<VerdictChip verdict={checkpoint.verdict} />
			) : (
				<StatusDot
					tone="info"
					label={t("scout.card.checkpoints.inProgress", "In progress")}
				/>
			)}
			<Curator checkpoint={checkpoint} onCurator={onCurator} />
		</Flex>
	);
}

function Curator({
	checkpoint,
	onCurator,
}: {
	checkpoint: CardCheckpoint;
	onCurator: (specialityId: string) => void;
}) {
	const { t } = useTranslate();
	const { curator } = checkpoint;
	const speciality = curator?.speciality;
	const level = skillLevelsList.find(
		(item) => item.value === speciality?.level,
	);

	return (
		<Flex gap={8} align="center" className={styles.curator}>
			<AppAvatar
				size={32}
				src={curator ? (curator.image ?? undefined) : AI_CURATOR_AVATAR}
			>
				{curator?.name?.[0]}
			</AppAvatar>
			<Flex vertical className={styles.min0}>
				{!curator ? (
					<Text>{t("checkpoints.curator.ai", "AI curator")}</Text>
				) : speciality ? (
					<Button
						type="link"
						size="small"
						className={styles.curatorName}
						onClick={(event) => {
							// The name sits in the panel's header; opening the card must not fold it.
							event.stopPropagation();
							onCurator(speciality.id);
						}}
					>
						{curator.name}
					</Button>
				) : (
					<Text>{curator.name}</Text>
				)}
				<Text type="secondary" className={styles.cpMeta} ellipsis>
					{!curator
						? t("scout.card.checkpoints.aiBasis", "Public game-dev knowledge")
						: speciality && (
								<>
									{speciality.name}
									{level && <> · {level.label}</>}
								</>
							)}
				</Text>
			</Flex>
		</Flex>
	);
}

function VerdictDetails({ checkpoint }: { checkpoint: CardCheckpoint }) {
	const { t } = useTranslate();
	return (
		<Flex vertical gap={16} className={styles.checkpointBody}>
			{checkpoint.verdictNote && (
				<Flex vertical gap={4}>
					<Text type="secondary" className={styles.cpMeta}>
						{t("scout.card.checkpoints.verdict", "Verdict")}
					</Text>
					<Paragraph className={styles.verdictNote}>
						{checkpoint.verdictNote}
					</Paragraph>
				</Flex>
			)}
			{checkpoint.directions.length > 0 && (
				<Directions checkpoint={checkpoint} />
			)}
		</Flex>
	);
}

function Directions({ checkpoint }: { checkpoint: CardCheckpoint }) {
	const { t } = useTranslate();
	const rows = [
		{
			key: "goal" as const,
			label: t("scout.card.checkpoints.goalRow", "Checkpoint goal"),
		},
		{
			key: "stage" as const,
			label: t("scout.card.checkpoints.stageRow", "Stage goal"),
		},
	];

	return (
		<Flex vertical gap={8}>
			<Flex justify="space-between" gap={12}>
				<Text type="secondary" className={styles.cpMeta}>
					{t("scout.card.checkpoints.directions", "Direction by sprint")}
				</Text>
				<Text type="secondary" className={styles.cpMeta}>
					{t(
						"scout.card.checkpoints.directionsHint",
						"Hover a sprint for the curator's reason",
					)}
				</Text>
			</Flex>
			{/* ui-guard-ignore frame 09.07.7 (`l6SPry`) draws a bespoke two-row track antd has no component for. */}
			<div className={styles.directions}>
				{rows.map((row) => (
					<Flex
						key={row.key}
						gap={12}
						align="center"
						className={styles.directionRow}
					>
						<Text type="secondary" className={styles.directionLabel}>
							{row.label}
						</Text>
						<Flex gap={4} flex={1} className={styles.min0}>
							{checkpoint.directions.map((sprint) => (
								<SprintCell
									key={sprint.sprint}
									sprint={sprint.sprint}
									read={sprint[row.key]}
								/>
							))}
						</Flex>
						<IconFlag size={14} className={styles.flag} />
					</Flex>
				))}
			</div>
		</Flex>
	);
}

function SprintCell({ sprint, read }: { sprint: number; read: DirectionRead }) {
	const label = useDirectionLabel();
	const Icon = HEADING[read.value];
	return (
		<Tooltip
			title={
				<>
					<strong>{label(read.value)}</strong>
					{read.why && <div>{read.why}</div>}
				</>
			}
		>
			{/* ui-guard-ignore frame 09.07.7: a tinted sprint cell of the direction track. */}
			<span className={styles.sprintCell} data-direction={read.value}>
				<span className={styles.sprintNumber}>S{sprint}</span>
				<Icon size={14} />
				<span className={styles.sprintWord}>{label(read.value)}</span>
			</span>
		</Tooltip>
	);
}
