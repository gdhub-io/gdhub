"use client";

import { IconFlag } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Collapse, Descriptions, Divider, Flex, Typography } from "antd";
import dayjs from "dayjs";
import type { ReactNode, Ref } from "react";
import type { JournalRevisionDto } from "@/types/checkpoint-journal";
import styles from "./style.module.scss";

export const when = (at: string) => dayjs(at).format("D MMM, HH:mm");

/** A line across the list where a sprint starts or the checkpoint ends, as the activity feed draws it. */
export function Boundary({
	label,
	ref,
	extra,
}: {
	label: string;
	ref?: Ref<HTMLDivElement>;
	/** GDHUB-156: an action on the step, under its line. */
	extra?: ReactNode;
}) {
	return (
		<Flex ref={ref} vertical className={styles.boundary}>
			<Divider plain className={styles.divider}>
				<span className={styles.boundaryLabel}>
					<IconFlag size={14} />
					{label}
				</span>
			</Divider>
			{extra && <Flex justify="center">{extra}</Flex>}
		</Flex>
	);
}

/** Under a message: its facts and what it was made from, both folded. */
export function FoldOuts({
	details = [],
	source,
	history = [],
}: {
	details?: { label: string; value: string }[];
	source: unknown;
	/** GDHUB-156: each Replace, oldest first. */
	history?: JournalRevisionDto[];
}) {
	const { t } = useTranslate();
	const label = (key: string) =>
		({
			task: t("admin.checkpoints.journal.detail.task", "Task"),
			link: t("admin.checkpoints.journal.detail.link", "Link"),
			sent: t("admin.checkpoints.journal.detail.sent", "Delivery"),
			inShort: t(
				"admin.checkpoints.journal.detail.inShort",
				"How the sprint stands",
			),
			focus: t(
				"admin.checkpoints.journal.detail.focus",
				"Focus for the next sprint",
			),
			advice: t(
				"admin.checkpoints.journal.detail.advice",
				"Advice on the tasks",
			),
		})[key] ?? key;
	return (
		<Collapse
			ghost
			size="small"
			className={styles.foldOuts}
			items={[
				...(details.length
					? [
							{
								key: "details",
								label: t("admin.checkpoints.journal.details", "Details"),
								children: (
									<Descriptions
										colon={false}
										size="small"
										column={1}
										layout="vertical"
										items={details.map((row) => ({
											key: row.label,
											label: label(row.label),
											children:
												row.label === "link" ? (
													<Typography.Link
														href={row.value}
														target="_blank"
														ellipsis
													>
														{row.value}
													</Typography.Link>
												) : (
													<span className={styles.lines}>{row.value}</span>
												),
										}))}
									/>
								),
							},
						]
					: []),
				...(history.length
					? [
							{
								key: "history",
								label: t(
									"admin.journal.history.title",
									"History · edited {count}×",
									{
										count: history.length,
									},
								),
								children: (
									<Flex vertical gap={12}>
										{history.map((revision) => (
											<Flex key={revision.at} vertical gap={2}>
												<Typography.Text
													type="secondary"
													className={styles.meta}
												>
													{revision.mode === "rebuild"
														? t(
																"admin.journal.history.rebuilt",
																"Input rebuilt {date}",
																{ date: when(revision.at) },
															)
														: t(
																"admin.journal.history.regenerated",
																"Regenerated {date}",
																{ date: when(revision.at) },
															)}
												</Typography.Text>
												{revision.hint && (
													<Typography.Text>
														{t("admin.journal.history.hint", "Hint: {hint}", {
															hint: revision.hint,
														})}
													</Typography.Text>
												)}
												<Typography.Text
													type="secondary"
													className={styles.lines}
												>
													{t(
														"admin.journal.history.previous",
														"Before: {text}",
														{
															text:
																revision.previous ??
																t("admin.journal.history.empty", "(nothing)"),
														},
													)}
												</Typography.Text>
											</Flex>
										))}
									</Flex>
								),
							},
						]
					: []),
				...(source
					? [
							{
								key: "source",
								label: t("admin.checkpoints.journal.source", "Source"),
								children: (
									<Typography.Paragraph type="secondary" className={styles.pre}>
										{JSON.stringify(source, null, 2)}
									</Typography.Paragraph>
								),
							},
						]
					: []),
			]}
		/>
	);
}
