"use client";

import type { Icon } from "@tabler/icons-react";
import { IconFlag, IconSparkles, IconUser } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Flex, Radio, Skeleton, Typography } from "antd";
import { useState } from "react";
import { EmptyState, IconTile } from "@/components/ui";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_PRICE_CURRENCY,
} from "@/config/checkpoint";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { useUpdateCheckpoint } from "@/hooks/checkpoints";
import styles from "./CuratorStep.module.scss";
import { CuratorTable } from "./CuratorTable";
import { usePrepareNav } from "./PrepareNav";
import { StartLayout, type StartStep } from "./StartLayout";
import { useCheckpointDraft } from "./useDraft";

/**
 * Frame 04 (`mNWjy`): who runs the 28 days.
 *
 * The kind is chosen first and it decides what follows: a person brings the list
 * of experts to pick from, the AI curator brings one fixed price. Neither card
 * carries a price any more — the difference between them is what they do.
 */
export function CuratorStep() {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const { go, exit } = usePrepareNav();
	const { draft, loading } = useCheckpointDraft();

	const update = useUpdateCheckpoint(draft?.id);
	const [kind, setKind] = useState<CheckpointCuratorKind | null>(null);
	const [person, setPerson] = useState<string | null>(null);

	if (loading) return <Skeleton active paragraph={{ rows: 6 }} />;

	if (!draft) {
		return (
			<EmptyState
				icon={IconFlag}
				title={t(
					"checkpoints.prepare.noDraft",
					"There is no draft to continue",
				)}
				action={
					<Button type="primary" onClick={exit}>
						{t("checkpoints.prepare.toWorkflow", "Back to the workflow")}
					</Button>
				}
			/>
		);
	}

	// The draft is opened with the AI curator, so the stored value is the choice
	// until the author touches it.
	const chosen = kind ?? draft.curatorKind;
	const chosenPerson = person ?? draft.curator?.id ?? null;

	const goTo = async (next: StartStep) => {
		try {
			await update.mutateAsync({
				curatorKind: chosen,
				// The AI curator is nobody in particular, so choosing it lets the
				// person go rather than leaving a stale name on the draft.
				curatorId: chosen === CheckpointCuratorKind.AI ? null : chosenPerson,
			});
			go(next);
		} catch {
			message.error(t("checkpoints.goal.saveFailed", "Could not save"));
		}
	};

	const option = (
		value: CheckpointCuratorKind,
		icon: Icon,
		name: string,
		description: string,
	) => (
		<button
			type="button"
			className={styles.option}
			data-chosen={chosen === value || undefined}
			onClick={() => setKind(value)}
		>
			<IconTile
				icon={icon}
				size="lg"
				tint={
					chosen === value ? "var(--gd-color-surface)" : "var(--gd-fill-subtle)"
				}
				ink="var(--gd-color-text)"
			/>
			<span className={styles.optionText}>
				<Typography.Text className={styles.optionName}>{name}</Typography.Text>
				<Typography.Text className={styles.optionDescription}>
					{description}
				</Typography.Text>
			</span>
			<Radio checked={chosen === value} />
		</button>
	);

	return (
		<StartLayout
			step="curator"
			title={t(
				"checkpoints.curator.title",
				"Who will take this journey with you?",
			)}
			onBack={() => goTo("now")}
			forward={
				<Button
					type="primary"
					loading={update.isPending}
					// A human curator is only chosen once somebody is actually picked.
					// "Nothing chosen at all" cannot be blocked here: a draft is created
					// with `curatorKind: AI`, so it is indistinguishable from the author
					// having picked the AI curator until the schema records the choice.
					disabled={chosen === CheckpointCuratorKind.Human && !chosenPerson}
					onClick={() => goTo("payment")}
				>
					{t("checkpoints.curator.next", "Next — payment")}
				</Button>
			}
		>
			<Flex vertical gap={24} className={styles.choices}>
				<div>
					<Typography.Text className={styles.label}>
						{t("checkpoints.curator.typeLabel", "Curator type")}
					</Typography.Text>
					<Flex gap={12}>
						{option(
							CheckpointCuratorKind.Human,
							IconUser,
							t("checkpoints.curator.expert", "Industry expert"),
							t(
								"checkpoints.curator.expertCalls",
								"A call every sprint, a final verdict, clear deadlines and reminders.",
							),
						)}
						{option(
							CheckpointCuratorKind.AI,
							IconSparkles,
							t("checkpoints.curator.ai", "AI curator"),
							t(
								"checkpoints.curator.aiWritten",
								"Written feedback every sprint, a final verdict, clear deadlines and reminders.",
							),
						)}
					</Flex>
				</div>

				{chosen === CheckpointCuratorKind.Human ? (
					<Flex vertical gap={12}>
						<div>
							<Typography.Text className={styles.label}>
								{t("checkpoints.curator.expertsLabel", "Industry experts")}
							</Typography.Text>

							<CuratorTable value={chosenPerson} onChange={setPerson} />
						</div>
					</Flex>
				) : (
					<Flex vertical gap={12}>
						<Flex vertical gap={4} className={styles.fixed}>
							<Typography.Text className={styles.fixedLabel}>
								{t(
									"checkpoints.curator.fixedPrice",
									"Fixed price for AI curator",
								)}
							</Typography.Text>
							<Typography.Text className={styles.fixedAmount}>
								{t("checkpoints.curator.amount", "{currency}{price}", {
									currency: CHECKPOINT_PRICE_CURRENCY,
									price: CHECKPOINT_AI_PRICE,
								})}
							</Typography.Text>
							<Typography.Text type="secondary" className={styles.vat}>
								{t("checkpoints.curator.vat", "+ VAT")}
							</Typography.Text>
						</Flex>

						<Typography.Text type="secondary" className={styles.note}>
							{t(
								"checkpoints.curator.aiLimit",
								"The AI curator reads links, screenshots and what you write. It does not run your build and it holds no calls — judging how a game feels to play is what a person is paid for.",
							)}
						</Typography.Text>
					</Flex>
				)}
			</Flex>
		</StartLayout>
	);
}
