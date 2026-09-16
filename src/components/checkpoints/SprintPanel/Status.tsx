"use client";

import { IconLock, IconTargetArrow } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Card, Flex, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { DevLogPostModal } from "@/components/modals/DevLogPostModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { CheckpointItemKind } from "@/config/prisma-enums";
import type { SprintFacts } from "@/lib/checkpoint-facts";
import { devlogDayOf } from "@/lib/checkpoint-sprints";
import type { CheckpointDto } from "@/types/checkpoints";
import { AskPanel, type AskRow } from "../AskPanel";
import { GoalStrip } from "../GoalStrip";
import { ScopeModal } from "../ScopeModal";
import styles from "./style.module.scss";

export type StatusProps = {
	checkpoint: CheckpointDto;
	facts: SprintFacts;
	onGo: (step: string) => void;
};

/**
 * What the sprint still wants, what has already happened in it, and what it
 * proved — in that order, each fact in exactly one of the three.
 */
export function Status({ checkpoint, facts, onGo }: StatusProps) {
	const { t } = useTranslate();
	const queryClient = useQueryClient();
	const [writing, setWriting] = useState(false);
	const [scope, setScope] = useState<"change" | "keep" | null>(null);
	const day = checkpoint.day ?? 0;
	const devlogDue = devlogDayOf(facts.sprint.number);
	const missing = facts.marks.asked - facts.marks.confirmed;

	const open: AskRow[] = [];

	// Only the sprint under way can still be answered: a devlog written now lands
	// in today's sprint, so asking for a past one is an ask that never closes.
	if (!facts.devlog && facts.sprint.state === "current") {
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
			actions: (
				<Button type="primary" onClick={() => setWriting(true)}>
					{t("checkpoints.devlog.write", "Write the devlog")}
				</Button>
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
			actions: (
				<>
					<Button type="primary" onClick={() => setScope("change")}>
						{t("checkpoints.scope.cta", "Change the outcomes")}
					</Button>
					<Button onClick={() => setScope("keep")}>
						{t("checkpoints.scope.keep", "Leave the list as it is")}
					</Button>
				</>
			),
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

	if (!facts.devlog && facts.sprint.state === "done") {
		happened.push({
			key: "no-devlog",
			glyph: "todo",
			title: t("checkpoints.devlog.missing", "No devlog was written"),
			meta: t(
				"checkpoints.devlog.missingNote",
				"Silence is part of the record; the verdict reads it as it is.",
			),
		});
	}

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
				"checkpoints.signals.markedCount",
				"{done} of {total} marked this sprint.",
				{
					done: facts.marks.confirmed,
					total: facts.marks.asked,
				},
			),
		});
	}

	const next = (checkpoint.sprints ?? []).find(
		(sprint) => sprint.number === facts.sprint.number + 1,
	);
	const nextStarted = !!next && next.state !== "ahead";
	const forward = {
		step: next ? `sprint-${next.number}` : "checkpoint",
		label: next
			? t("checkpoints.forward.openSprint", "Open sprint {n}", {
					n: next.number,
				})
			: t("checkpoints.forward.toCheckpoint", "To the checkpoint"),
		// Locked for two different reasons, and it says which: work still open
		// here, or a sprint that has not begun yet.
		disabled: open.length > 0 || (!!next && !nextStarted),
		note: open.length
			? t(
					"checkpoints.forward.locked",
					"Answer what is open and finish this sprint to open the next one.",
				)
			: next && !nextStarted
				? t("checkpoints.forward.opensOn", "Sprint {n} opens on {date}.", {
						n: next.number,
						date: dayjs.utc(next.from).format("D MMM"),
					})
				: t(
						"checkpoints.forward.ready",
						"Nothing is left in this sprint. Opening it moves you there.",
					),
	};

	return (
		<Flex vertical gap={16}>
			<GoalStrip goal={checkpoint.goal} />

			<ScopeModal
				open={!!scope}
				mode={scope ?? "change"}
				checkpoint={checkpoint}
				onClose={() => setScope(null)}
			/>

			<DevLogPostModal
				projectId={checkpoint.projectId}
				open={writing}
				onClose={() => setWriting(false)}
				onSave={() => {
					setWriting(false);
					queryClient.invalidateQueries({
						queryKey: ["checkpoint", checkpoint.id],
					});
				}}
			/>

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
				footer={{
					note: forward.note,
					action: (
						<Button
							type={forward.disabled ? "default" : "primary"}
							disabled={forward.disabled}
							icon={forward.disabled ? <IconLock size={14} /> : undefined}
							onClick={() => onGo(forward.step)}
						>
							{forward.label}
						</Button>
					),
				}}
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

			<Card
				size="small"
				styles={{ body: { padding: 0 } }}
				title={
					<span className={styles.cardTitle}>
						{t("checkpoints.proved.title", "What this sprint proved")}
					</span>
				}
				extra={
					<Typography.Text type="secondary" className={styles.cardMeta}>
						{t("checkpoints.proved.count", "{count} of {total} outcomes", {
							count: facts.outcomesProved.length,
							total: checkpoint.items.filter(
								(item) => item.kind === CheckpointItemKind.Outcome,
							).length,
						})}
					</Typography.Text>
				}
			>
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
			</Card>
		</Flex>
	);
}
