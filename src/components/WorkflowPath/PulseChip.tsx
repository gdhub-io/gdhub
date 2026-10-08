import { IconCheck } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Popover, Typography } from "antd";
import { useId } from "react";
import { dayRange } from "@/components/checkpoints/CheckpointCard/SprintTrack";
import { StatusDot } from "@/components/ui";
import { AppAvatar } from "@/components/ui/AppAvatar";
import type {
	CheckpointPulseRowDto,
	CheckpointSprintDto,
} from "@/types/checkpoints";
import styles from "./style.module.scss";

// ui-guard: off the 07.2 matrix is people by days — a grid of tiles, not a data table

const { Text } = Typography;

const initials = (name: string | null) =>
	(name ?? "")
		.split(" ")
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();

const BASELINE = 12;
/** Each beat's height against the tallest: a live trace is never even. */
const PEAKS = [1, 0.3, 0.65, 0.25, 0.85, 0.4];
const WIDTH = 72;
/** How far back the fading tail reaches behind the head. */
const TAIL = 44;

/**
 * Frame `X9H3O`: a heart-rate trace, one beat per member who confirmed the
 * sprint. A flat line is a sprint nobody has answered yet, not a dead team.
 */
function PulseTrace({ beats }: { beats: number }) {
	const step = WIDTH / (beats + 1);
	const path = Array.from({ length: beats }, (_, index) => {
		const x = step * (index + 1);
		const h = PEAKS[index % PEAKS.length];
		return `L ${x - 4} ${BASELINE} L ${x - 2.5} ${BASELINE + 2 * h} L ${x} ${BASELINE - 10 * h} L ${x + 2} ${BASELINE + 3 * h} L ${x + 4} ${BASELINE}`;
	}).join(" ");

	const d = `M 0 ${BASELINE} ${path} L ${WIDTH} ${BASELINE}`;
	const id = useId();

	return (
		<svg
			width={WIDTH}
			height={20}
			viewBox={`0 0 ${WIDTH} 20`}
			className={styles.pulseLine}
			aria-hidden="true"
		>
			{/* The zero line; the beats show only as the sweep runs over them. */}
			<path
				d={`M 0 ${BASELINE} L ${WIDTH} ${BASELINE}`}
				fill="none"
				stroke="currentColor"
				strokeWidth={0.5}
				className={styles.pulseGhost}
			/>
			{/* The whole trace in red, seen only through a window that slides left
			    to right: bright at its leading edge, fading out behind it. */}
			<defs>
				<linearGradient
					id={`${id}-fade`}
					gradientUnits="userSpaceOnUse"
					x1={0}
					x2={TAIL}
				>
					<stop offset={0} stopColor="white" stopOpacity={0} />
					<stop offset={0.85} stopColor="white" stopOpacity={0.6} />
					<stop offset={1} stopColor="white" />
				</linearGradient>
				<mask
					id={`${id}-sweep`}
					maskUnits="userSpaceOnUse"
					x={0}
					y={0}
					width={WIDTH}
					height={20}
				>
					<rect
						width={TAIL}
						height={20}
						fill={`url(#${id}-fade)`}
						className={styles.pulseSweep}
					/>
				</mask>
				<mask
					id={`${id}-head`}
					maskUnits="userSpaceOnUse"
					x={0}
					y={0}
					width={WIDTH}
					height={20}
				>
					<rect
						x={TAIL - 2}
						width={2}
						height={20}
						fill="white"
						className={styles.pulseSweep}
					/>
				</mask>
			</defs>
			<path
				d={d}
				fill="none"
				stroke="currentColor"
				strokeWidth={1.5}
				mask={`url(#${id}-sweep)`}
			/>
			{/* The head: the same trace, thicker, through a 2px window at the front. */}
			<path
				d={d}
				fill="none"
				stroke="currentColor"
				strokeWidth={3}
				strokeLinecap="round"
				strokeLinejoin="round"
				mask={`url(#${id}-head)`}
			/>
		</svg>
	);
}

export type PulseChipProps = {
	rows: CheckpointPulseRowDto[];
	sprint: CheckpointSprintDto;
	/** The checkpoint's day today; null before it starts. */
	day: number | null;
};

/**
 * The sprint's pulse as a small trace; opening it shows who did something on
 * which day of the sprint — frame `kMsaL`.
 */
export function PulseChip({ rows, sprint, day }: PulseChipProps) {
	const { t } = useTranslate();
	const cells = rows.flatMap((row) => {
		const cell = row.cells.find((item) => item.sprint === sprint.number);
		return cell && cell.state !== "notOnTeam" ? [{ row, cell }] : [];
	});
	const beats = cells.filter(({ cell }) => cell.state === "confirmed").length;
	const days = Array.from(
		{ length: sprint.lastDay - sprint.firstDay + 1 },
		(_, index) => sprint.firstDay + index,
	);

	const content = (
		<div className={styles.pulseMatrix}>
			<div className={styles.pulseHead}>
				<Text strong className={styles.pulseTitle}>
					{t("workflow.path.pulse.title", "Team pulse")}
				</Text>
				<Text type="secondary" className={styles.pulseMeta}>
					{t("workflow.path.pulse.sprint", "Sprint {number} · {dates}", {
						number: String(sprint.number),
						dates: dayRange(sprint.from, sprint.to),
					})}
				</Text>
			</div>

			{cells.length === 0 ? (
				<Text type="secondary" className={styles.pulseEmpty}>
					{t("workflow.path.pulse.empty", "Nobody has been asked yet.")}
				</Text>
			) : (
				<>
					<div className={`${styles.pulseRow} ${styles.pulseCols}`}>
						<span />
						{days.map((value, index) => (
							<span
								key={value}
								className={`${styles.pulseDay}${value === day ? ` ${styles.pulseToday}` : ""}`}
							>
								{index + 1}
							</span>
						))}
					</div>
					{cells.map(({ row, cell }) => (
						<div key={row.memberId} className={styles.pulseRow}>
							<div className={styles.pulsePerson}>
								<AppAvatar src={row.image} size={28}>
									{initials(row.name)}
								</AppAvatar>
								<div className={styles.pulseWho}>
									<span className={styles.pulseName}>
										<Text
											type={cell.state === "missed" ? "secondary" : undefined}
										>
											{row.name}
										</Text>
										{cell.state === "missed" && (
											<StatusDot
												tone="warning"
												label={t("workflow.path.pulse.quiet", "Quiet")}
											/>
										)}
									</span>
									{row.role && (
										<Text type="secondary" className={styles.pulseRole}>
											{row.role}
										</Text>
									)}
								</div>
							</div>
							{days.map((value) =>
								row.activeDays.includes(value) ? (
									<span key={value} className={styles.pulseCheck}>
										<IconCheck size={16} />
									</span>
								) : (
									<span key={value} className={styles.pulseIdle} />
								),
							)}
						</div>
					))}
				</>
			)}

			<Text type="secondary" className={styles.pulseFoot}>
				{t(
					"workflow.path.pulse.hint",
					"A check is a day with a devlog, an artifact or the pulse link.",
				)}
			</Text>
		</div>
	);

	return (
		<Popover
			content={content}
			trigger="click"
			placement="bottomRight"
			classNames={{ container: styles.pulsePopover }}
		>
			{/* ui-guard-ignore a pill holding a drawn trace; antd Button would square it off */}
			<button type="button" className={styles.pulse}>
				{t("workflow.path.pulse.label", "Pulse")}
				<PulseTrace beats={Math.min(beats, 6)} />
			</button>
		</Popover>
	);
}
