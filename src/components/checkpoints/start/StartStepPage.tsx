"use client";

import { IconFlag, IconSparkles } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Flex, Input, Modal, Skeleton, Typography } from "antd";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui";
import { CheckpointItemKind } from "@/config/prisma-enums";
import {
	useDiscardCheckpoint,
	useGoalCheck,
	useSuggestLines,
	useUpdateCheckpoint,
} from "@/hooks/checkpoints";
import { CHECKPOINT_GOAL_MAX } from "@/schemas/checkpoint";
import type { GoalCheckResult } from "@/services/checkpoint-curator/types";
import { type GoalLine, GoalLines } from "./GoalLines";
import { usePrepareNav } from "./PrepareNav";
import { StartLayout, type StartStep } from "./StartLayout";
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
	const { project, draft, loading } = useCheckpointDraft();

	const update = useUpdateCheckpoint(draft?.id);
	const discard = useDiscardCheckpoint();

	const kind =
		step === "now" ? CheckpointItemKind.Input : CheckpointItemKind.Outcome;
	const [lines, setLines] = useState<GoalLine[]>([]);
	const [goal, setGoal] = useState("");
	const [remark, setRemark] = useState<GoalCheckResult | null>(null);
	const check = useGoalCheck(draft?.id);
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
				title={t("checkpoints.start.noDraft", "There is no draft to continue")}
				description={t(
					"checkpoints.start.noDraftHint",
					"Start a checkpoint from the list and the goal card opens here.",
				)}
				action={
					<Button type="primary" onClick={exit}>
						{t("checkpoints.start.toList", "Back to checkpoints")}
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
			// Leaving the outcome list is the moment the curator's read is worth
			// hearing: the card is saved, nothing is bought yet, and going back is
			// one press. It is advice, so it can be argued with and walked past.
			if (!isNow && next === "curator") {
				try {
					const result = await check.mutateAsync();

					if (!result.reachable || result.missing.length > 0) {
						setRemark(result);

						return;
					}
				} catch {
					// The curator being unreachable must not hold up a purchase.
				}
			}

			go(next);
		} catch {
			message.error(t("checkpoints.goal.saveFailed", "Could not save"));
		}
	};

	const cancel = async () => {
		try {
			await discard.mutateAsync(draft.id);
			exit();
		} catch {
			message.error(
				t(
					"checkpoints.draft.discardFailed",
					"The draft could not be discarded",
				),
			);
		}
	};

	const isNow = step === "now";

	return (
		<StartLayout
			step={step}
			question={
				isNow
					? t("checkpoints.start.q1", "What exists today?")
					: t(
							"checkpoints.start.q2",
							"Where do you want the project to be in 28 days?",
						)
			}
			hint={
				isNow
					? t(
							"checkpoints.start.h1",
							"Carried over from your last result card — correct it rather than retype it.",
						)
					: t(
							"checkpoints.start.h2",
							"One line per thing that has to exist by the end. Each gets its proof attached as it lands.",
						)
			}
			onBack={isNow ? undefined : () => goTo("now")}
			onCancel={cancel}
			forward={
				<Button
					type="primary"
					loading={update.isPending || check.isPending}
					onClick={() => goTo(isNow ? "goal" : "curator")}
				>
					{isNow
						? t("checkpoints.start.next1", "Next — what will exist")
						: t("checkpoints.start.next2", "Next — who curates")}
				</Button>
			}
		>
			{/* The sentence first, the list under it: an author says what they want
			    and then details it, not the other way round. */}
			{!isNow && (
				<Flex vertical gap={6} style={{ marginBottom: 24 }}>
					<Typography.Text strong>
						{t("checkpoints.goal.sentence", "The goal, in one sentence")}
					</Typography.Text>
					<Input.TextArea
						value={goal}
						rows={2}
						maxLength={CHECKPOINT_GOAL_MAX}
						disabled={update.isPending}
						placeholder={t(
							"checkpoints.goal.placeholder",
							"Ship a playable prototype a stranger can finish in 15 minutes without help.",
						)}
						onChange={(event) => setGoal(event.target.value)}
					/>
					<Typography.Text type="secondary">
						{t(
							"checkpoints.goal.sentenceHint",
							"One sentence the 28 days are judged against. The list below is how it is proven.",
						)}
					</Typography.Text>
				</Flex>
			)}

			<Flex
				align="center"
				justify="space-between"
				gap={12}
				style={{ marginBottom: 8 }}
			>
				<Typography.Text strong>
					{isNow
						? t("checkpoints.goal.inputsTitle", "What the project has today")
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
						type="text"
						icon={<IconSparkles size={16} stroke={1.6} />}
						loading={suggest.isPending}
						disabled={update.isPending || (!isNow && !goal.trim())}
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

			{!isNow && (
				<Flex vertical gap={16} style={{ marginTop: 24 }}>
					<Typography.Text type="secondary">
						{t(
							"checkpoints.start.draftNote",
							"The curator goes through this list with you on day 1 and cuts it to what 28 days actually hold. It is fixed after that, not at checkout.",
						)}
					</Typography.Text>
				</Flex>
			)}
			<Modal
				open={!!remark}
				onCancel={() => setRemark(null)}
				title={
					remark?.reachable
						? t("checkpoints.goal.remarkMissing", "The stage asks for more")
						: t(
								"checkpoints.goal.remarkTight",
								"This looks like more than 28 days hold",
							)
				}
				footer={
					<Flex justify="flex-end" gap={8}>
						<Button onClick={() => setRemark(null)}>
							{t("checkpoints.goal.remarkEdit", "Go back and edit")}
						</Button>
						<Button
							type="primary"
							onClick={() => {
								setRemark(null);
								go("curator");
							}}
						>
							{t("checkpoints.goal.remarkAnyway", "Go on anyway")}
						</Button>
					</Flex>
				}
			>
				<Flex vertical gap={10}>
					<Typography.Text>{remark?.note}</Typography.Text>
					{remark?.missing.map((line: string) => (
						<Typography.Text key={line} type="secondary">
							{t(
								"checkpoints.goal.checkMissing",
								"The stage also asks for: {line}",
								{ line },
							)}
						</Typography.Text>
					))}
					<Typography.Text type="secondary">
						{t(
							"checkpoints.start.check.note",
							"Checked by the AI curator · advice, not a gate",
						)}
					</Typography.Text>
				</Flex>
			</Modal>
		</StartLayout>
	);
}
