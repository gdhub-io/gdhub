"use client";

import { IconFlag, IconSparkles, IconUser } from "@tabler/icons-react";
import { T, useTranslate } from "@tolgee/react";
import {
	App,
	Button,
	Flex,
	Radio,
	Skeleton,
	Table,
	Tag,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import SpecialistPreviewModal from "@/components/modals/SpecialistPreviewModal";
import { EmptyState } from "@/components/ui";
import { AppAvatar } from "@/components/ui/AppAvatar";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_HUMAN_PRICE_FROM,
	CHECKPOINT_PRICE_CURRENCY,
} from "@/config/checkpoint-pricing";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import {
	useCheckpointCurators,
	useDiscardCheckpoint,
	useUpdateCheckpoint,
} from "@/hooks/checkpoints";
import type { CheckpointCurator } from "@/repositories/checkpoint-curators";
import styles from "./CuratorStep.module.scss";
import { usePrepareNav } from "./PrepareNav";
import { StartLayout, type StartStep } from "./StartLayout";
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
	const { go, exit } = usePrepareNav();
	const { draft, loading } = useCheckpointDraft();

	const update = useUpdateCheckpoint(draft?.id);
	const discard = useDiscardCheckpoint();
	const [kind, setKind] = useState<CheckpointCuratorKind | null>(null);
	const [person, setPerson] = useState<string | null>(null);
	const [preview, setPreview] = useState<string>();
	const curators = useCheckpointCurators();

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
			question={t("checkpoints.start.q3", "Who runs the 28 days?")}
			hint={t(
				"checkpoints.start.h3",
				"AI or a person — one role, two ways to run the cycle.",
			)}
			onBack={() => goTo("goal")}
			onCancel={cancel}
			forward={
				<Button
					type="primary"
					loading={update.isPending}
					onClick={() => goTo("planning")}
				>
					{t("checkpoints.start.next3", "Next — summary")}
				</Button>
			}
		>
			<Flex gap={12} className={styles.kinds}>
				{option(
					CheckpointCuratorKind.AI,
					IconSparkles,
					t("checkpoints.curator.aiName", "AI curator, in writing"),
					t(
						"checkpoints.curator.aiDescription",
						"Written reviews and a day-28 verdict.",
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
						"Five live calls, written reviews and a verdict.",
					),
					t("checkpoints.curator.humanPrice", "from {currency}{price}", {
						currency: CHECKPOINT_PRICE_CURRENCY,
						price: CHECKPOINT_HUMAN_PRICE_FROM,
					}),
				)}
			</Flex>

			<Flex vertical gap={12} style={{ marginTop: 16 }}>
				{chosen === CheckpointCuratorKind.Human && (
					<Flex vertical gap={8} className={styles.picker}>
						<Typography.Text className={styles.pickerLabel}>
							{t("checkpoints.curator.pickerLabel", "Curators for this stage")}
						</Typography.Text>

						{/* A table without a head: the rows are the same five facts each
						    time, and a header over three unlabelled columns would name
						    nothing the eye does not already have. Pressing anywhere on a
						    row picks it; the dot on the right is where the answer lands. */}
						<Table<CheckpointCurator>
							showHeader={false}
							pagination={false}
							loading={curators.isLoading}
							rowKey="userId"
							size="middle"
							className={styles.people}
							dataSource={curators.data ?? []}
							onRow={(row: CheckpointCurator) => ({
								onClick: () => setPerson(row.userId),
							})}
							locale={{
								emptyText: t(
									"checkpoints.curator.noneOpen",
									"Nobody is taking checkpoints at the moment. The AI curator runs these 28 days, or the draft waits until someone is.",
								),
							}}
							columns={
								[
									{
										key: "who",
										render: (_: unknown, row: CheckpointCurator) => (
											<Flex
												gap={12}
												align="center"
												className={styles.personRow}
											>
												<AppAvatar src={row.image} size={40}>
													{row.name.slice(0, 1).toUpperCase()}
												</AppAvatar>
												<Flex vertical gap={4} className={styles.personText}>
													<Flex gap={8} align="center">
														<Typography.Text className={styles.name}>
															{row.name}
														</Typography.Text>
														<Tag bordered={false} className={styles.level}>
															<T keyName={row.level} />
														</Tag>
													</Flex>
													<Typography.Text
														type="secondary"
														className={styles.description}
														ellipsis
													>
														{[row.role, row.specialization]
															.filter(Boolean)
															.join(" · ")}
													</Typography.Text>
												</Flex>
											</Flex>
										),
									},
									{
										key: "talent",
										width: 120,
										render: (_: unknown, row: CheckpointCurator) => (
											// Choosing a curator and reading about one are different
											// intentions, so the row carries both.
											<Button
												type="link"
												className={styles.talent}
												onClick={(event) => {
													event.stopPropagation();
													setPreview(row.specialityId);
												}}
											>
												{t("checkpoints.curator.talentCard", "Talent card")}
											</Button>
										),
									},
									{
										key: "pick",
										width: 48,
										align: "center",
										render: (_: unknown, row: CheckpointCurator) => (
											<Radio
												checked={chosenPerson === row.userId}
												onChange={() => setPerson(row.userId)}
											/>
										),
									},
								] satisfies ColumnsType<CheckpointCurator>
							}
						/>

						<Typography.Text type="secondary">
							{t(
								"checkpoints.curator.pickerNote",
								"The 28 days start when they take it on, not when you pay; if they turn it down you pick another or get your money back.",
							)}
						</Typography.Text>
					</Flex>
				)}
			</Flex>

			<SpecialistPreviewModal
				specialistId={preview}
				open={!!preview}
				onCancel={() => setPreview(undefined)}
			/>

			<Typography.Paragraph type="secondary" className={styles.note}>
				{t(
					"checkpoints.curator.aiLimit",
					"The AI curator reads links, screenshots and what you write. It does not run your build and it holds no calls — judging how a game feels to play is what a person is paid for.",
				)}
			</Typography.Paragraph>
		</StartLayout>
	);
}
