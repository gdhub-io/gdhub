"use client";

import { IconFlag, IconSparkles, IconUser } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Flex, Radio, Skeleton, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/ui";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_HUMAN_PRICE_FROM,
	CHECKPOINT_PRICE_CURRENCY,
} from "@/config/checkpoint-pricing";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { useDiscardCheckpoint, useUpdateCheckpoint } from "@/hooks/checkpoints";
import styles from "./CuratorStep.module.scss";
import { StartLayout } from "./StartLayout";
import { useCheckpointDraft } from "./useDraft";

/**
 * Step 3: who runs the 28 days (frame `vE1BQ`).
 *
 * Two kinds in one slot, priced, so the choice is made on what it costs and what
 * it buys rather than on which is the default. Picking a person from the list of
 * curators for the stage arrives with GDHUB-42, which is where the curator
 * registry — level, rate, record, rating — comes from.
 */
export function CuratorStep() {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const router = useRouter();
	const { project, draft, loading, base } = useCheckpointDraft();

	const update = useUpdateCheckpoint(draft?.id);
	const discard = useDiscardCheckpoint();
	const [kind, setKind] = useState<CheckpointCuratorKind | null>(null);

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
					<Button type="primary" onClick={() => router.push(base)}>
						{t("checkpoints.start.toList", "Back to checkpoints")}
					</Button>
				}
			/>
		);
	}

	// The draft is opened with the AI curator, so the stored value is the choice
	// until the author touches it.
	const chosen = kind ?? draft.curatorKind;

	const goTo = async (path: string) => {
		try {
			await update.mutateAsync({ curatorKind: chosen });
			router.push(path);
		} catch {
			message.error(t("checkpoints.goal.saveFailed", "Could not save"));
		}
	};

	const cancel = async () => {
		try {
			await discard.mutateAsync(draft.id);
			router.push(base);
		} catch {
			message.error(
				t(
					"checkpoints.draft.discardFailed",
					"The draft could not be discarded",
				),
			);
		}
	};

	const option = (
		value: CheckpointCuratorKind,
		Icon: typeof IconSparkles,
		name: string,
		description: string,
		price: string,
	) => (
		<button
			type="button"
			className={styles.option}
			data-chosen={chosen === value || undefined}
			onClick={() => setKind(value)}
		>
			<span className={styles.tile}>
				<Icon size={18} stroke={1.6} />
			</span>
			<span className={styles.text}>
				<Typography.Text className={styles.name}>{name}</Typography.Text>
				<Typography.Text className={styles.description}>
					{description}
				</Typography.Text>
			</span>
			<span className={styles.right}>
				<Typography.Text className={styles.price}>{price}</Typography.Text>
				<Radio checked={chosen === value} />
			</span>
		</button>
	);

	return (
		<StartLayout
			step="curator"
			stageName={draft.stageName}
			question={t("checkpoints.start.q3", "Who runs the 28 days?")}
			hint={t(
				"checkpoints.start.h3",
				"Both walk the same five moments. A person says them on a call; the AI curator writes them.",
			)}
			onBack={() => goTo(`${base}/new/outcomes`)}
			onCancel={cancel}
			footNote={
				// Step 4 is drawn in the rail but needs Paddle (GDHUB-38).
				<Typography.Text type="secondary" className={styles.pending}>
					{t("checkpoints.start.paymentPending", "Paying is not open yet")}
				</Typography.Text>
			}
			forward={
				<Button
					type="primary"
					loading={update.isPending}
					onClick={() => goTo(base)}
				>
					{t("checkpoints.start.saveDraft", "Save the draft")}
				</Button>
			}
		>
			<Flex vertical gap={12}>
				{option(
					CheckpointCuratorKind.AI,
					IconSparkles,
					t("checkpoints.curator.aiName", "AI curator, in writing"),
					t(
						"checkpoints.curator.aiDescription",
						"Reads every devlog, answers in writing, writes the verdict on day 28.",
					),
					t("checkpoints.curator.aiPrice", "{currency}{price} fixed", {
						currency: CHECKPOINT_PRICE_CURRENCY,
						price: CHECKPOINT_AI_PRICE,
					}),
				)}
				{option(
					CheckpointCuratorKind.Human,
					IconUser,
					t("checkpoints.curator.humanName", "A person, on five calls"),
					t(
						"checkpoints.curator.humanDescription",
						"Five 45-minute calls with your team, plus everything written.",
					),
					t("checkpoints.curator.humanPrice", "from {currency}{price}", {
						currency: CHECKPOINT_PRICE_CURRENCY,
						price: CHECKPOINT_HUMAN_PRICE_FROM,
					}),
				)}

				{chosen === CheckpointCuratorKind.Human && (
					<Flex vertical gap={8} className={styles.picker}>
						<Typography.Text className={styles.pickerLabel}>
							{t("checkpoints.curator.pickerLabel", "Curators for this stage")}
						</Typography.Text>
						<Typography.Text type="secondary">
							{t(
								"checkpoints.curator.pickerPending",
								"Choosing your own curator is not open yet — the platform assigns one for the stage. The 28 days start when they take the checkpoint on, not when you pay; if they turn it down you pick another or get your money back.",
							)}
						</Typography.Text>
					</Flex>
				)}
			</Flex>

			<Typography.Paragraph type="secondary" className={styles.note}>
				{t(
					"checkpoints.curator.aiLimit",
					"The AI curator reads links, screenshots and what you write. It does not run your build and it holds no calls — judging how a game feels to play is what a person is paid for.",
				)}
			</Typography.Paragraph>
		</StartLayout>
	);
}
