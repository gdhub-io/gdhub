"use client";

import { IconTargetArrow } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Flex, Typography } from "antd";
import dayjs from "dayjs";
import { EmptyState } from "@/components/ui/EmptyState";
import { CheckpointItemKind } from "@/config/prisma-enums";
import type { SprintFacts } from "@/lib/checkpoint-facts";
import { devlogDayOf } from "@/lib/checkpoint-sprints";
import type { CheckpointDto } from "@/types/checkpoints";
import { AskPanel, type AskRow } from "../AskPanel";
import { GoalStrip } from "../GoalStrip";
import styles from "./style.module.scss";

export type StatusProps = {
	checkpoint: CheckpointDto;
	facts: SprintFacts;
};

/**
 * What the sprint still wants, what has already happened in it, and what it
 * proved — in that order, each fact in exactly one of the three.
 */
export function Status({ checkpoint, facts }: StatusProps) {
	const { t } = useTranslate();
	const day = checkpoint.day ?? 0;
	const devlogDue = devlogDayOf(facts.sprint.number);
	const missing = facts.marks.asked - facts.marks.confirmed;

	const open: AskRow[] = [];

	if (!facts.devlog && facts.sprint.state !== "ahead") {
		open.push({
			key: "devlog",
			glyph: day >= devlogDue ? "open" : "todo",
			title: t("checkpoints.devlog.write", "Write the devlog"),
			owner: t("checkpoints.asks.owner.you", "You"),
			due:
				day >= devlogDue
					? t("checkpoints.asks.dueToday", "due today")
					: t("checkpoints.asks.dueOnDay", "due on day {day}", {
							day: devlogDue,
						}),
			dueUrgent: day >= devlogDue,
			meta: t(
				"checkpoints.devlog.meta",
				"What got done, what is next, and what is in the way.",
			),
		});
	}

	if (facts.scopeNote) {
		open.push({
			key: "scope",
			glyph: "open",
			title: t("checkpoints.scope.check", "Check the scope"),
			owner: t("checkpoints.asks.owner.you", "You"),
			due: t("checkpoints.asks.dueToday", "due today"),
			dueUrgent: true,
			meta: facts.scopeNote,
		});
	}

	if (missing > 0) {
		open.push({
			key: "marks",
			glyph: "todo",
			title: t("checkpoints.signals.missing", "A mark is missing"),
			owner: t("checkpoints.asks.owner.team", "Team"),
			due: t("checkpoints.signals.confirmedOf", "{done} of {total}", {
				done: facts.marks.confirmed,
				total: facts.marks.asked,
			}),
			meta: facts.marks.missing.filter(Boolean).join(", "),
		});
	}

	const happened: AskRow[] = [];

	if (facts.devlog) {
		happened.push({
			key: "devlog",
			glyph: "done",
			title: t("checkpoints.devlog.published", "Devlog published"),
			meta: dayjs(facts.devlog.publishedAt).format("D MMM"),
		});
	}

	if (facts.review) {
		happened.push({
			key: "review",
			glyph: "done",
			title: t("checkpoints.review.in", "The review for the sprint is in"),
			meta: facts.review.at
				? dayjs(facts.review.at).format("D MMM")
				: undefined,
		});
	}

	if (facts.marks.confirmed > 0) {
		happened.push({
			key: "marks",
			glyph: "done",
			title: t(
				"checkpoints.signals.marked",
				"{done} of {total} marked the sprint",
				{
					done: facts.marks.confirmed,
					total: facts.marks.asked,
				},
			),
		});
	}

	return (
		<Flex vertical gap={16}>
			<GoalStrip goal={checkpoint.goal} />

			<AskPanel
				title={t("checkpoints.asks.title", "What this sprint asks of you")}
				info={t(
					"checkpoints.asks.info",
					"Everything still open in this sprint, and who it waits on. It empties as the sprint is answered.",
				)}
				count={
					open.length
						? t("checkpoints.asks.open", "{count} open", { count: open.length })
						: t("checkpoints.asks.none", "nothing open")
				}
				countDone={!open.length}
				rows={
					open.length
						? open
						: [
								{
									key: "none",
									glyph: "done",
									title: t(
										"checkpoints.asks.noneTitle",
										"Nothing is waiting on anyone",
									),
								},
							]
				}
			/>

			{!!happened.length && (
				<AskPanel
					title={t("checkpoints.happened.title", "What has happened")}
					rows={happened}
				/>
			)}

			<div className={styles.card}>
				<Flex
					align="center"
					justify="space-between"
					gap={12}
					className={styles.cardHead}
				>
					<Typography.Text className={styles.cardTitle}>
						{t("checkpoints.proved.title", "What this sprint proved")}
					</Typography.Text>
					<Typography.Text type="secondary" className={styles.cardMeta}>
						{t("checkpoints.proved.count", "{count} of {total} outcomes", {
							count: facts.outcomesProved.length,
							total: checkpoint.items.filter(
								(item) => item.kind === CheckpointItemKind.Outcome,
							).length,
						})}
					</Typography.Text>
				</Flex>

				{facts.outcomesProved.length ? (
					<div className={styles.rows}>
						{facts.outcomesProved.map((item) => (
							<Flex
								key={item.id}
								gap={12}
								align="center"
								className={styles.row}
							>
								<Typography.Text className={styles.rowText}>
									{item.text}
								</Typography.Text>
								<Typography.Text className={styles.proof}>
									{item.artifact?.name ?? item.artifact?.link}
								</Typography.Text>
							</Flex>
						))}
					</div>
				) : (
					<EmptyState
						size="compact"
						icon={IconTargetArrow}
						title={t("checkpoints.proved.empty", "Nothing claimed yet")}
						description={t(
							"checkpoints.proved.emptyNote",
							"An outcome appears here when the artifact that claims it lands inside this sprint.",
						)}
					/>
				)}
			</div>
		</Flex>
	);
}
