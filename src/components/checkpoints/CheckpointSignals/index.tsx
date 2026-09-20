"use client";

import {
	IconNotebook,
	IconPaperclip,
	IconUserCheck,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Flex, Typography } from "antd";
import clsx from "clsx";
import { IconTile } from "@/components/ui/IconTile";
import { CHECKPOINT_EVIDENCE_DAY } from "@/schemas/checkpoint";
import type { CheckpointSignalsDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

export type CheckpointSignalsProps = {
	signals: CheckpointSignalsDto;
	/** The day of the checkpoint, so the evidence note can stop being a warning. */
	day: number | null;
};

/**
 * The three numbers under the day counter — frame `qfMkz`.
 *
 * Each one is a count and the shape of that count: the devlogs as four segments
 * because there are always four, the pulses as one dot per person because the
 * team is however large it is, and the evidence as a sentence because "none yet"
 * on day 3 and on day 27 are the same number and not the same news.
 */
export function CheckpointSignals({ signals, day }: CheckpointSignalsProps) {
	const { t } = useTranslate();
	const { devlogs, pulses, evidence } = signals;

	// One-based positions rather than indices: a segment is sprint 3, a dot is the
	// fourth person, and the mark is on when the count has reached it.
	const upTo = (total: number) =>
		Array.from({ length: total }, (_, index) => index + 1);

	return (
		<Flex gap={24} className={styles.band}>
			<div className={styles.signal}>
				<Flex gap={12} align="center">
					<IconTile icon={IconNotebook} size="sm" />
					<Flex vertical gap={4}>
						<Typography.Text type="secondary" className={styles.label}>
							{t("checkpoints.signals.devlogs", "Devlogs")}
						</Typography.Text>
						<Typography.Text className={styles.value}>
							{t("checkpoints.signals.of", "{done} of {total}", devlogs)}
						</Typography.Text>
					</Flex>
				</Flex>

				<Flex gap={4} align="center" className={styles.meter}>
					{upTo(devlogs.total).map((sprint) => (
						<span
							key={sprint}
							className={clsx(
								styles.segment,
								sprint <= devlogs.done && styles.segmentDone,
							)}
						/>
					))}
				</Flex>
			</div>

			<span className={styles.separator} />

			<div className={styles.signal}>
				<Flex gap={12} align="center">
					<IconTile icon={IconUserCheck} size="sm" />
					<Flex vertical gap={4}>
						<Typography.Text type="secondary" className={styles.label}>
							{t("checkpoints.signals.pulsesThisSprint", "Pulses this sprint")}
						</Typography.Text>
						<Typography.Text className={styles.value}>
							{t("checkpoints.signals.of", "{done} of {total}", pulses)}
						</Typography.Text>
					</Flex>
				</Flex>

				<Flex gap={6} align="center" className={styles.meter}>
					{upTo(pulses.total).map((slot) => (
						<span
							key={slot}
							className={clsx(
								styles.dot,
								slot <= pulses.done && styles.dotDone,
							)}
						/>
					))}
				</Flex>
			</div>

			<span className={styles.separator} />

			<div className={styles.signal}>
				<Flex gap={12} align="center">
					<IconTile icon={IconPaperclip} size="sm" />
					<Flex vertical gap={4}>
						<Typography.Text type="secondary" className={styles.label}>
							{t("checkpoints.signals.artifacts", "Artifacts")}
						</Typography.Text>
						<Typography.Text className={styles.value}>
							{evidence.done
								? t("checkpoints.signals.of", "{done} of {total}", evidence)
								: t("checkpoints.signals.noneAttached", "Not attached")}
						</Typography.Text>
					</Flex>
				</Flex>

				{evidence.done < evidence.total && (
					<Typography.Text type="secondary" className={styles.note}>
						{(day ?? 0) >= CHECKPOINT_EVIDENCE_DAY
							? t("checkpoints.signals.askedFor", "Asked for since day {day}", {
									day: CHECKPOINT_EVIDENCE_DAY,
								})
							: t("checkpoints.signals.askedOn", "Asked for on day {day}", {
									day: CHECKPOINT_EVIDENCE_DAY,
								})}
					</Typography.Text>
				)}
			</div>
		</Flex>
	);
}
