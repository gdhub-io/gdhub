"use client";

import { useTranslate } from "@tolgee/react";
import { Collapse, Flex, Typography } from "antd";
import dayjs from "dayjs";
import { SectionHeading } from "@/components/ui";
import type { CheckpointDto } from "@/types/checkpoints";
import { CuratorBadge } from "../CuratorBadge";
import { VerdictChip } from "../VerdictChip";
import { buildThread, type ThreadEntry, type ThreadEntryKind } from "./entries";
import styles from "./style.module.scss";

export type CheckpointThreadProps = {
	checkpoint: CheckpointDto;
};

/**
 * The road already travelled, collapsed (frames `HyaoU`, `qXEDm`).
 *
 * One line per event — the day, the date and what it was — with the body behind
 * a chevron. It is a record, not a working surface: the thing to do now is the
 * card above it, and an entry opened here is opened to re-read, not to act.
 *
 * The pulse weeks and the artifact entries join it with GDHUB-35 and GDHUB-39,
 * where their data comes from.
 */
export function CheckpointThread({ checkpoint }: CheckpointThreadProps) {
	const { t } = useTranslate();
	const entries = buildThread(checkpoint);

	if (entries.length === 0) return null;

	const kindLabel: Record<ThreadEntryKind, string> = {
		started: t("checkpoints.thread.started", "Checkpoint started"),
		goalAgreed: t(
			"checkpoints.thread.goalAgreed",
			"Goal card agreed, and fixed",
		),
		devlog: t("checkpoints.thread.devlog", "Devlog"),
		scopeNote: t("checkpoints.thread.scopeNote", "The curator's scope note"),
		revised: t("checkpoints.thread.revised", "The outcome list changed"),
		verdict: t("checkpoints.thread.verdict", "The verdict"),
	};

	const title = (entry: ThreadEntry) =>
		entry.kind === "devlog" && entry.title
			? `${kindLabel.devlog} — ${entry.title}`
			: kindLabel[entry.kind];

	return (
		<Flex vertical gap={12}>
			<SectionHeading
				level={4}
				title={t("checkpoints.thread.title", "What has happened so far")}
			/>

			<Collapse
				ghost
				className={styles.thread}
				items={entries.map((entry) => ({
					key: entry.key,
					// An entry with nothing behind the chevron is a line, not a panel:
					// offering to open "Checkpoint started" only teaches the reader that
					// the chevrons here mean nothing.
					collapsible: entry.body ? undefined : "disabled",
					showArrow: !!entry.body,
					className: entry.body
						? styles.entry
						: `${styles.entry} ${styles.flat}`,
					label: (
						<Flex gap={10} align="center" className={styles.line}>
							<span className={styles.dot} data-kind={entry.kind} />
							<Typography.Text className={styles.when}>
								{entry.day
									? t("checkpoints.thread.day", "Day {day} · {date}", {
											day: entry.day,
											date: dayjs(entry.at).format("D MMM"),
										})
									: dayjs(entry.at).format("D MMM")}
							</Typography.Text>
							<Typography.Text className={styles.what} ellipsis>
								{title(entry)}
							</Typography.Text>
							{entry.kind === "verdict" && checkpoint.verdict && (
								<VerdictChip verdict={checkpoint.verdict} />
							)}
						</Flex>
					),
					children: entry.body ? (
						<Flex vertical gap={12} className={styles.body}>
							<Typography.Paragraph className={styles.text}>
								{entry.body}
							</Typography.Paragraph>

							{entry.answer && (
								<Flex vertical gap={4} className={styles.answer}>
									<Typography.Text className={styles.kicker}>
										{entry.answer.at
											? t(
													"checkpoints.thread.answered",
													"The curator answered, {date}",
													{ date: dayjs(entry.answer.at).format("D MMM") },
												)
											: t(
													"checkpoints.thread.answeredPlain",
													"The curator answered",
												)}
									</Typography.Text>
									<Typography.Paragraph className={styles.text}>
										{entry.answer.text}
									</Typography.Paragraph>
								</Flex>
							)}

							{entry.kind === "verdict" && (
								<Flex vertical gap={12}>
									<Flex gap={8} align="center">
										<Typography.Text className={styles.kicker}>
											{t("checkpoints.thread.decidedBy", "Decided by")}
										</Typography.Text>
										<CuratorBadge
											kind={checkpoint.curatorKind}
											curator={checkpoint.curator}
										/>
									</Flex>
									{checkpoint.summary && (
										<Typography.Paragraph className={styles.text}>
											{checkpoint.summary}
										</Typography.Paragraph>
									)}
								</Flex>
							)}
						</Flex>
					) : null,
				}))}
			/>
		</Flex>
	);
}
