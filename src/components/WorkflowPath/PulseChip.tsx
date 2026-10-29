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
const WIDTH = 72;
/** How far back the fading tail reaches behind the head. */
const TAIL = 44;

/**
 * Frame `X9H3O`: a heart-rate trace across the sprint's seven days, a beat on
 * each day someone did something, taller the more people did. A flat line is a
 * sprint nobody has been active in yet, not a dead team.
 */
function PulseTrace({ beats, still }: { beats: number[]; still?: boolean }) {
	const step = WIDTH / beats.length;
	const most = Math.max(1, ...beats);
	const path = beats
		.map((count, index) => {
			if (!count) return "";
			const x = step * (index + 0.5);
			const h = 0.45 + (0.55 * count) / most;
			return `L ${x - 4} ${BASELINE} L ${x - 2.5} ${BASELINE + 2 * h} L ${x} ${BASELINE - 10 * h} L ${x + 2} ${BASELINE + 3 * h} L ${x + 4} ${BASELINE}`;
		})
		.join(" ");

	const d = `M 0 ${BASELINE} ${path} L ${WIDTH} ${BASELINE}`;
	const id = useId();

	if (still)
		return (
			<svg
				width={WIDTH}
				height={20}
				viewBox={`0 0 ${WIDTH} 20`}
				className={styles.pulseStill}
				aria-hidden="true"
			>
				<path d={d} fill="none" stroke="currentColor" strokeWidth={1} />
			</svg>
		);

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
	/** A sprint behind: the trace it ended with, grey and not moving. */
	still?: boolean;
};

/**
 * The sprint's pulse as a small trace; opening it shows who did something on
 * which day of the sprint — frame `kMsaL`.
 */
export function PulseChip({ rows, sprint, day, still }: PulseChipProps) {
	const { t } = useTranslate();
	const cells = rows.flatMap((row) => {
		const cell = row.cells.find((item) => item.sprint === sprint.number);
		return cell && cell.state !== "notOnTeam" ? [{ row, cell }] : [];
	});
	const days = Array.from(
		{ length: sprint.lastDay - sprint.firstDay + 1 },
		(_, index) => sprint.firstDay + index,
	);
	const beats = days.map(
		(value) => cells.filter(({ row }) => row.activeDays.includes(value)).length,
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
			<button
				type="button"
				className={
					still ? `${styles.pulse} ${styles.pulseQuiet}` : styles.pulse
				}
			>
				{t("workflow.path.pulse.label", "Pulse")}
				<PulseTrace beats={beats} still={still} />
			</button>
		</Popover>
	);
}
