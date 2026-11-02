"use client";

import { useTranslate } from "@tolgee/react";
import { Tooltip, Typography } from "antd";
import { Lens, useLenses } from "@/components/checkpoints/CallRoom/CallNotes";
import { DirectionDot } from "@/components/checkpoints/SprintDirection";
import { CURATOR_LENSES, SPRINTS_PER_CHECKPOINT } from "@/config/checkpoint";
import type { VerdictContextDto } from "@/types/checkpoints";
import { Aside, Section } from "./Section";
import styles from "./style.module.scss";

const { Text } = Typography;

/** Frames 12.14 `O2zGAP` / 12.14.1 `UyWez`: each sprint's direction, the why on hover; "—" is not yet known. */
export function DirectionStrip({ run }: { run: VerdictContextDto["run"] }) {
	const { t } = useTranslate();
	const sprints = Array.from(
		{ length: SPRINTS_PER_CHECKPOINT },
		(_, i) => i + 1,
	);
	const rows = [
		["goal", t("advisor.verdict.direction.goal", "Checkpoint")],
		["stage", t("advisor.verdict.direction.stage", "Stage")],
	] as const;

	return (
		<Section
			title={t("advisor.verdict.direction.title", "Direction by sprint")}
		>
			<div className={styles.strip}>
				<span />
				{sprints.map((sprint) => (
					<Text key={sprint} type="secondary" className={styles.small}>
						{t("advisor.verdict.direction.sprint", "S{n}", { n: sprint })}
					</Text>
				))}
				{rows.map(([key, label]) => (
					<div key={key} className={styles.stripRow}>
						<Text type="secondary" className={styles.small}>
							{label}
						</Text>
						{sprints.map((sprint) => {
							const read = run.directions.find((row) => row.sprint === sprint)
								?.direction[key];
							return read ? (
								<Tooltip key={sprint} title={read.why}>
									<span>
										<DirectionDot value={read.value} />
									</span>
								</Tooltip>
							) : (
								<Text key={sprint} type="secondary">
									—
								</Text>
							);
						})}
					</div>
				))}
			</div>
		</Section>
	);
}

/** Frames 12.14 `zHBLr` / 12.14.1 `sYu6w`: what changed since day 1, by lens. */
export function RunDifference({
	difference,
	final,
}: {
	difference: NonNullable<VerdictContextDto["run"]["difference"]>;
	/** Before the final call the numbers are "so far". */
	final: boolean;
}) {
	const { t } = useTranslate();
	const lenses = useLenses();

	return (
		<Section
			title={t("advisor.verdict.change.title", "What changed over the 28 days")}
			aside={
				<Aside>
					{final
						? t("advisor.verdict.change.range", "Day 1 → day 28")
						: t("advisor.verdict.change.soFar", "Day 1 → today, so far")}
				</Aside>
			}
		>
			<div className={styles.lenses}>
				{CURATOR_LENSES.map((lens) => (
					<Lens key={lens} icon={lenses[lens].icon} title={lenses[lens].title}>
						{difference[lens].length ? (
							difference[lens].map((line) => (
								<Text key={line} className={styles.small}>
									{line}
								</Text>
							))
						) : (
							<Text type="secondary" className={styles.small}>
								{t("advisor.verdict.change.none", "No change")}
							</Text>
						)}
					</Lens>
				))}
			</div>
		</Section>
	);
}
