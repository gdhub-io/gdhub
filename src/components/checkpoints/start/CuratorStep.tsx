"use client";

import type { Icon } from "@tabler/icons-react";
import { IconFlag, IconSparkles, IconUser } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Flex, Radio, Skeleton, Typography } from "antd";
import { useState } from "react";
import SpecialistPreviewModal from "@/components/modals/SpecialistPreviewModal";
import { EmptyState, IconTile } from "@/components/ui";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_PRICE_CURRENCY,
} from "@/config/checkpoint-pricing";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import {
	useCheckpointCurators,
	useUpdateCheckpoint,
} from "@/hooks/checkpoints";
import styles from "./CuratorStep.module.scss";
import { CuratorTable } from "./CuratorTable";
import { usePrepareNav } from "./PrepareNav";
import { StartLayout, type StartStep } from "./StartLayout";
import { useCheckpointDraft } from "./useDraft";

/**
 * Step 3: who runs the 28 days (frame `vE1BQ`).
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
	const [preview, setPreview] = useState<string>();
	const _curators = useCheckpointCurators();

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

	// The draft is opened with the AI curator, so the stored value is the choice
	// until the author touches it.
	const chosen = kind ?? draft.curatorKind;
	const chosenPerson = person ?? draft.curator?.id ?? null;
	const _talentCard = t("checkpoints.curator.talentCard", "Talent card");

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
			<span className={styles.optionHead}>
				<IconTile icon={icon} size="sm" />
				<Radio checked={chosen === value} />
			</span>
			<Typography.Text className={styles.optionName}>{name}</Typography.Text>
			<Typography.Text className={styles.optionDescription}>
				{description}
			</Typography.Text>
		</button>
	);

	return (
		<StartLayout
			step="curator"
			hint={t(
				"checkpoints.prepare.h3",
				"Choose who you want to take this journey with.",
			)}
			onBack={() => goTo("goal")}
			forward={
				<Button
					type="primary"
					loading={update.isPending}
					// A human curator is only chosen once somebody is actually picked.
					// "Nothing chosen at all" cannot be blocked here: a draft is created
					// with `curatorKind: AI`, so it is indistinguishable from the author
					// having picked the AI curator until the schema records the choice.
					disabled={chosen === CheckpointCuratorKind.Human && !chosenPerson}
					onClick={() => goTo("planning")}
				>
					{t("checkpoints.prepare.next3", "Next — planning")}
				</Button>
			}
		>
			<Flex vertical gap={24}>
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
								"checkpoints.curator.expertDescription",
								"Live calls, written reviews and a verdict.",
							),
						)}
						{option(
							CheckpointCuratorKind.AI,
							IconSparkles,
							t("checkpoints.curator.ai", "AI curator"),
							t(
								"checkpoints.curator.aiDescription",
								"Written reviews and a day-28 verdict.",
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

			<SpecialistPreviewModal
				withOffer={false}
				specialistId={preview}
				open={!!preview}
				onCancel={() => setPreview(undefined)}
			/>
		</StartLayout>
	);
}
