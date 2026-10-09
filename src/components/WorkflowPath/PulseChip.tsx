import { useTranslate } from "@tolgee/react";
import { Popover, Typography } from "antd";
import { pulseCellLabel } from "@/components/checkpoints/SprintPanel/Signals";
import { StatusDot, type StatusTone } from "@/components/ui";
import type {
	CheckpointPulseCellDto,
	CheckpointPulseRowDto,
} from "@/types/checkpoints";
import styles from "./style.module.scss";

const { Text } = Typography;

const BASELINE = 12;
const WIDTH = 72;

/**
 * Frame `X9H3O`: a heart-rate trace, one beat per member who confirmed the
 * sprint. A flat line is a sprint nobody has answered yet, not a dead team.
 */
function PulseTrace({ beats }: { beats: number }) {
	const step = WIDTH / (beats + 1);
	const path = Array.from({ length: beats }, (_, index) => {
		const x = step * (index + 1);
		return `L ${x - 4} ${BASELINE} L ${x - 2.5} ${BASELINE + 2} L ${x} ${BASELINE - 10} L ${x + 2} ${BASELINE + 3} L ${x + 4} ${BASELINE}`;
	}).join(" ");

	return (
		<svg
			width={WIDTH}
			height={20}
			viewBox={`0 0 ${WIDTH} 20`}
			className={styles.pulseLine}
			aria-hidden="true"
		>
			<path
				d={`M 0 ${BASELINE} ${path} L ${WIDTH} ${BASELINE}`}
				fill="none"
				stroke="currentColor"
				strokeWidth={1}
			/>
		</svg>
	);
}

const TONE: Record<CheckpointPulseCellDto["state"], StatusTone> = {
	confirmed: "success",
	waiting: "neutral",
	missed: "warning",
	notAsked: "neutral",
	notOnTeam: "neutral",
};

export type PulseChipProps = {
	rows: CheckpointPulseRowDto[];
	sprint: number;
};

/** The sprint's pulse as a small trace; opening it names who has checked in. */
export function PulseChip({ rows, sprint }: PulseChipProps) {
	const { t } = useTranslate();
	const cells = rows.flatMap((row) => {
		const cell = row.cells.find((item) => item.sprint === sprint);
		return cell && cell.state !== "notOnTeam" ? [{ row, cell }] : [];
	});
	const beats = cells.filter(({ cell }) => cell.state === "confirmed").length;

	const content = (
		<div className={styles.pulseTable}>
			{cells.length === 0 ? (
				<Text type="secondary">
					{t("workflow.path.pulse.empty", "Nobody has been asked yet.")}
				</Text>
			) : (
				cells.map(({ row, cell }) => (
					<div key={row.memberId} className={styles.pulseRow}>
						<Text>{row.name}</Text>
						<StatusDot
							tone={TONE[cell.state]}
							label={pulseCellLabel(t, cell)}
						/>
					</div>
				))
			)}
		</div>
	);

	return (
		<Popover
			content={content}
			title={t("workflow.path.pulse.title", "Team pulse")}
			trigger="click"
			placement="bottomRight"
		>
			{/* ui-guard-ignore a pill holding a drawn trace; antd Button would square it off */}
			<button type="button" className={styles.pulse}>
				{t("workflow.path.pulse.label", "Pulse")}
				<PulseTrace beats={Math.min(beats, 6)} />
			</button>
		</Popover>
	);
}
