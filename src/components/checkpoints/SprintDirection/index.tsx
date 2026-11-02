"use client";

import { IconCompass } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Segmented, Tooltip, Typography } from "antd";
import { type ReactNode, useState } from "react";
import { StatusDot, type StatusTone } from "@/components/ui";
import { DIRECTIONS, type Direction } from "@/config/checkpoint";
import { useConfirmDirection } from "@/hooks/checkpoint-call";
import type { DirectionRead, SprintDirection } from "@/types/checkpoints";
import styles from "./style.module.scss";

/** Not a failure, so never red: sideways is information, standing still a warning. */
const TONE: Record<Direction, StatusTone> = {
	toward: "success",
	sideways: "info",
	stalled: "warning",
	idle: "neutral",
};

export const useDirectionLabel = () => {
	const { t } = useTranslate();
	return (value: Direction) =>
		({
			toward: t("checkpoints.direction.toward", "Toward the goal"),
			sideways: t("checkpoints.direction.sideways", "Gone sideways"),
			stalled: t("checkpoints.direction.stalled", "Standing still"),
			idle: t("checkpoints.direction.idle", "Nothing done"),
		})[value];
};

export function DirectionDot({ value }: { value: Direction }) {
	const label = useDirectionLabel();
	return <StatusDot tone={TONE[value]} label={label(value)} />;
}

const useTargets = (stage: string) => {
	const { t } = useTranslate();
	return {
		goal: t("checkpoints.direction.goal", "Checkpoint goal"),
		stage: t("checkpoints.direction.stage", "Stage goal · {stage}", { stage }),
	};
};

function Heading() {
	const { t } = useTranslate();
	return (
		<span className={styles.heading}>
			<IconCompass size={14} />
			<Typography.Text className={styles.label}>
				{t("checkpoints.direction.title", "Direction")}
			</Typography.Text>
		</span>
	);
}

/** Frames 12.10.3 (`T1MAy`) and 12.08.7d: the two directions, read only. */
export function SprintDirectionView({
	direction,
	stage,
	aside,
}: {
	direction: SprintDirection;
	stage: string;
	/** Beside the heading: the curator's confirmation and its Change. */
	aside?: ReactNode;
}) {
	const targets = useTargets(stage);
	return (
		<div className={styles.block}>
			<Flex justify="space-between" align="center">
				<Heading />
				{aside}
			</Flex>
			<div className={styles.columns}>
				{(["goal", "stage"] as const).map((key) => (
					<div key={key} className={styles.column}>
						<Typography.Text type="secondary" className={styles.label}>
							{targets[key]}
						</Typography.Text>
						<DirectionDot value={direction[key].value} />
						<Typography.Text>{direction[key].why}</Typography.Text>
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * Frame 12.08.7b (`NWjdM`): the human curator's word on the directions after
 * a call, preset to the call's or the brief's, changeable until the final call.
 */
export function DirectionConfirm({
	checkpointId,
	index,
	direction,
	stage,
	editable,
}: {
	checkpointId: string;
	index: number;
	direction: SprintDirection | undefined;
	stage: string;
	/** False once the final call has started. */
	editable: boolean;
}) {
	const { t } = useTranslate();
	const label = useDirectionLabel();
	const targets = useTargets(stage);
	const confirm = useConfirmDirection(checkpointId, index);
	const [editing, setEditing] = useState(!direction?.confirmedAt);
	const [draft, setDraft] = useState<
		Partial<Record<"goal" | "stage", DirectionRead>>
	>({
		goal: direction?.goal,
		stage: direction?.stage,
	});

	if (direction?.confirmedAt && !editing) {
		return (
			<SprintDirectionView
				direction={direction}
				stage={stage}
				aside={
					<Flex gap="small" align="center">
						<StatusDot
							tone="success"
							label={t("checkpoints.direction.confirmed", "Confirmed")}
						/>
						{editable && (
							<Button size="small" onClick={() => setEditing(true)}>
								{t("checkpoints.direction.change", "Change")}
							</Button>
						)}
					</Flex>
				}
			/>
		);
	}

	const { goal, stage: stageRead } = draft;
	return (
		<div className={styles.block}>
			<Flex justify="space-between" align="center">
				<Heading />
				<StatusDot
					tone="warning"
					label={t("checkpoints.direction.notConfirmed", "Not confirmed")}
				/>
			</Flex>
			<Typography.Text type="secondary">
				{t(
					"checkpoints.direction.confirmHint",
					"Preset from the call and the brief. The author sees them once you confirm.",
				)}
			</Typography.Text>
			{(["goal", "stage"] as const).map((key) => (
				<div key={key} className={styles.column}>
					<Typography.Text type="secondary" className={styles.label}>
						{targets[key]}
					</Typography.Text>
					<Segmented<Direction>
						value={draft[key]?.value}
						options={DIRECTIONS.map((value) => ({
							value,
							label: label(value),
						}))}
						onChange={(value) =>
							setDraft((current) => ({
								...current,
								[key]: { value, why: current[key]?.why ?? "" },
							}))
						}
						disabled={!editable}
					/>
					{draft[key]?.why && (
						<Typography.Text>{draft[key]?.why}</Typography.Text>
					)}
				</div>
			))}
			<Tooltip
				title={
					editable
						? undefined
						: t(
								"checkpoints.direction.closed",
								"The directions are settled once the final call starts.",
							)
				}
			>
				<Button
					type="primary"
					className={styles.confirm}
					disabled={!editable || !goal || !stageRead}
					loading={confirm.isPending}
					onClick={async () => {
						if (!goal || !stageRead) return;
						await confirm.mutateAsync({ goal, stage: stageRead });
						setEditing(false);
					}}
				>
					{t("checkpoints.direction.confirm", "Confirm directions")}
				</Button>
			</Tooltip>
		</div>
	);
}
