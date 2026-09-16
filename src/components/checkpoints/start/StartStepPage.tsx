"use client";

import { IconFlag, IconSparkles } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Flex, Input, Skeleton, Typography } from "antd";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui";
import { CheckpointItemKind } from "@/config/prisma-enums";
import { useSuggestLines, useUpdateCheckpoint } from "@/hooks/checkpoints";
import { CHECKPOINT_GOAL_MAX } from "@/schemas/checkpoint";
import { type GoalLine, GoalLines } from "./GoalLines";
import { usePrepareNav } from "./PrepareNav";
import { StartLayout, type StartStep } from "./StartLayout";
import styles from "./StartStepPage.module.scss";
import { useCheckpointDraft } from "./useDraft";

export type StartStepPageProps = {
	step: Extract<StartStep, "now" | "goal">;
};

/**
 * Steps 1 and 2, which are the same page asking about two sides of the same
 * card. Every keystroke is held here and written when the step is left, so the
 * back button works and a refresh loses nothing.
 */
export function StartStepPage({ step }: StartStepPageProps) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const { go, exit } = usePrepareNav();
	const { draft, loading } = useCheckpointDraft();

	const update = useUpdateCheckpoint(draft?.id);

	const kind =
		step === "now" ? CheckpointItemKind.Input : CheckpointItemKind.Outcome;
	const [lines, setLines] = useState<GoalLine[]>([]);
	const [goal, setGoal] = useState("");
	const suggest = useSuggestLines(draft?.id);

	useEffect(() => {
		if (!draft) return;

		setGoal(draft.goal);
		setLines(
			draft.items
				.filter((item) => item.kind === kind)
				.map((item) => ({
					key: item.id,
					text: item.text,
					artifact: item.artifact,
				})),
		);
	}, [draft, kind]);

	if (loading) return <Skeleton active paragraph={{ rows: 6 }} />;

	if (!draft) {
		return (
			<EmptyState
				icon={IconFlag}
				title={t(
					"checkpoints.prepare.noDraft",
					"There is no draft to continue",
				)}
				description={t(
					"checkpoints.prepare.noDraftHint",
					"Start a checkpoint from the list and the goal card opens here.",
				)}
				action={
					<Button type="primary" onClick={exit}>
						{t("checkpoints.prepare.toList", "Back to checkpoints")}
					</Button>
				}
			/>
		);
	}

	const goTo = async (next: StartStep) => {
		const written = lines
			.filter((line) => line.text.trim())
			.map((line) => ({
				kind,
				text: line.text.trim(),
				artifactId: line.artifact?.id ?? null,
			}));

		try {
			await update.mutateAsync(
				kind === CheckpointItemKind.Input
					? { inputs: written }
					: { outcomes: written, goal: goal.trim() },
			);
			go(next);
		} catch {
			message.error(t("checkpoints.goal.saveFailed", "Could not save"));
		}
	};

	const isNow = step === "now";

	return (
		<StartLayout
			step={step}
			hint={
				isNow
					? t(
							"checkpoints.prepare.h1",
							"Review what carried over from the last checkpoint.",
						)
					: t(
							"checkpoints.prepare.h2",
							"Define the goal and outcomes that must exist by day 28.",
						)
			}
			onBack={isNow ? undefined : () => goTo("now")}
			forward={
				<Button
					type="primary"
					loading={update.isPending || suggest.isPending}
					// Every question has to be answered before the next one opens: the
					// card is what the curator is paid to judge, and a blank side of it
					// is not something anyone can be held to.
					disabled={
						!lines.some((line) => line.text.trim()) || (!isNow && !goal.trim())
					}
					onClick={() => goTo(isNow ? "goal" : "curator")}
				>
					{isNow
						? t("checkpoints.prepare.next1", "Next — goal")
						: t("checkpoints.prepare.next2", "Next — curator")}
				</Button>
			}
		>
			{/* The sentence first, the list under it: an author says what they want
			    and then details it, not the other way round. */}
			{!isNow && (
				<div className={styles.block}>
					<Typography.Text className={styles.label}>
						{t("checkpoints.goal.sentence", "The goal, in one sentence")}
					</Typography.Text>
					<Input.TextArea
						variant="filled"
						value={goal}
						maxLength={CHECKPOINT_GOAL_MAX}
						showCount
						rows={4}
						disabled={update.isPending}
						className={styles.goalField}
						placeholder={t(
							"checkpoints.goal.placeholder",
							"Ship a playable prototype a stranger can finish in 15 minutes without help.",
						)}
						onChange={(event) => setGoal(event.target.value)}
					/>
				</div>
			)}

			<div className={styles.block}>
				<Flex align="center" justify="space-between" gap={12}>
					<Typography.Text className={styles.label}>
						{isNow
							? t("checkpoints.goal.inputsTitle", "What exists today")
							: t(
									"checkpoints.goal.outcomesTitle",
									"What it will have by day 28",
								)}
					</Typography.Text>

					{/* Only where the author is promising something: on day 1 the input
					    list is what the project already has, and nobody needs help
					    remembering that. The curator proposes, the lines land in the form
					    as a draft, and every one of them is edited or dropped from there. */}
					{!isNow && (
						<Button
							icon={<IconSparkles size={16} stroke={1.6} />}
							className={styles.suggest}
							loading={suggest.isPending}
							disabled={update.isPending || !goal.trim()}
							onClick={async () => {
								try {
									const proposed = await suggest.mutateAsync(kind);

									setLines((was) => [
										...was.filter((line) => line.text.trim()),
										...proposed.map((text, index) => ({
											key: `suggested-${Date.now()}-${index}`,
											text,
											artifact: null,
										})),
									]);
								} catch {
									message.error(
										t(
											"checkpoints.goal.suggestFailed",
											"The curator could not suggest anything just now",
										),
									);
								}
							}}
						>
							{t("checkpoints.goal.suggest", "Suggest with AI")}
						</Button>
					)}
				</Flex>

				<GoalLines
					lines={lines}
					onChange={setLines}
					disabled={update.isPending}
					placeholder={
						isNow
							? t("checkpoints.goal.inputPlaceholder", "A concept document")
							: t(
									"checkpoints.goal.outcomePlaceholder",
									"A playable vertical slice",
								)
					}
					withEvidence={isNow}
				/>
			</div>

			{!isNow && (
				<Typography.Text type="secondary" className={styles.note}>
					{t(
						"checkpoints.prepare.draftNote",
						"You can revise this with the curator before the cycle starts.",
					)}
				</Typography.Text>
			)}
		</StartLayout>
	);
}
