"use client";

import { IconFlag } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Skeleton, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui";
import { CheckpointItemKind } from "@/config/prisma-enums";
import { useDiscardCheckpoint, useUpdateCheckpoint } from "@/hooks/checkpoints";
import { useProjectArtifacts } from "@/hooks/project-artifacts";
import { type GoalLine, GoalLines } from "./GoalLines";
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
	const router = useRouter();
	const { project, draft, loading, base } = useCheckpointDraft();

	const { data: artifacts } = useProjectArtifacts(project?.id);
	const update = useUpdateCheckpoint(draft?.id);
	const discard = useDiscardCheckpoint();

	const kind =
		step === "now" ? CheckpointItemKind.Input : CheckpointItemKind.Outcome;
	const [lines, setLines] = useState<GoalLine[]>([]);

	useEffect(() => {
		if (!draft) return;

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
					<Button type="primary" onClick={() => router.push(base)}>
						{t("checkpoints.start.toList", "Back to checkpoints")}
					</Button>
				}
			/>
		);
	}

	const goTo = async (path: string) => {
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
					: { outcomes: written },
			);
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

	const isNow = step === "now";

	return (
		<StartLayout
			step={step}
			stageName={draft.stageName}
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
			onBack={isNow ? undefined : () => goTo(`${base}/new/inputs`)}
			onCancel={cancel}
			footNote={
				// Step 4 needs Paddle (GDHUB-38). Saying so beats a forward button
				// that reads as if the purchase were finished early.
				isNow ? undefined : (
					<Typography.Text type="secondary" className={styles.pending}>
						{t("checkpoints.start.paymentPending", "Paying is not open yet")}
					</Typography.Text>
				)
			}
			forward={
				<Button
					type="primary"
					loading={update.isPending}
					onClick={() =>
						goTo(isNow ? `${base}/new/outcomes` : `${base}/new/curator`)
					}
				>
					{isNow
						? t("checkpoints.start.next1", "Next — what will exist")
						: t("checkpoints.start.next2", "Next — who curates")}
				</Button>
			}
		>
			<GoalLines
				lines={lines}
				artifacts={artifacts ?? []}
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
				emptyEvidenceLabel={
					isNow
						? undefined
						: t("checkpoints.evidence.later", "Proof at the end")
				}
			/>

			{!isNow && (
				<Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
					{t(
						"checkpoints.start.draftNote",
						"The curator goes through this list with you on day 1 and cuts it to what 28 days actually hold. It is fixed after that, not at checkout.",
					)}
				</Typography.Paragraph>
			)}
		</StartLayout>
	);
}
