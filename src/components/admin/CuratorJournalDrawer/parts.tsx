"use client";

import { IconFlag } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Collapse, Descriptions, Divider, Flex, Typography } from "antd";
import dayjs from "dayjs";
import type { Ref } from "react";
import styles from "./style.module.scss";

export const when = (at: string) => dayjs(at).format("D MMM, HH:mm");
export const day = (at: string) => dayjs(at).format("D MMM");

/** A line across the list where a sprint starts or the checkpoint ends, as the activity feed draws it. */
export function Boundary({
	label,
	ref,
}: {
	label: string;
	ref?: Ref<HTMLDivElement>;
}) {
	return (
		<Flex ref={ref} vertical className={styles.boundary}>
			<Divider plain className={styles.divider}>
				<span className={styles.boundaryLabel}>
					<IconFlag size={14} />
					{label}
				</span>
			</Divider>
		</Flex>
	);
}

/** Under a message: its facts and what it was made from, both folded. */
export function FoldOuts({
	details = [],
	source,
	sourceLabel,
}: {
	details?: { label: string; value: string }[];
	source: unknown;
	sourceLabel?: string;
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
				...(source
					? [
							{
								key: "source",
								label:
									sourceLabel ??
									t("admin.checkpoints.journal.source", "Source"),
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
