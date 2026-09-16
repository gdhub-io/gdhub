"use client";

import type { Icon } from "@tabler/icons-react";
import { IconFlag, IconId, IconSparkles, IconUser } from "@tabler/icons-react";
import { T, useTranslate } from "@tolgee/react";
import {
	App,
	Button,
	Flex,
	Radio,
	Skeleton,
	Table,
	Tag,
	Tooltip,
	Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import SpecialistPreviewModal from "@/components/modals/SpecialistPreviewModal";
import { EmptyState, IconTile } from "@/components/ui";
import { AppAvatar } from "@/components/ui/AppAvatar";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_PRICE_CURRENCY,
	curatorPrice,
} from "@/config/checkpoint-pricing";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import {
	useCheckpointCurators,
	useUpdateCheckpoint,
} from "@/hooks/checkpoints";
import type { CheckpointCurator } from "@/repositories/checkpoint-curators";
import { CuratorRow } from "./CuratorRow";
import styles from "./CuratorStep.module.scss";
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
	const curators = useCheckpointCurators();

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
	const talentCard = t("checkpoints.curator.talentCard", "Talent card");

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

							{/* A table without a head: the rows are the same few facts each
							    time, and a header over unlabelled columns would name nothing
							    the eye does not already have. Pressing anywhere on a row picks
							    it; the radio on the right is where the answer lands. */}
							<Table<CheckpointCurator>
								showHeader={false}
								pagination={false}
								// Without it the name column grows with the longest summary and
								// pushes the price, the talent card and the radio past the edge.
								tableLayout="fixed"
								loading={curators.isLoading}
								rowKey="userId"
								size="middle"
								className={styles.people}
								dataSource={curators.data ?? []}
								onRow={(row: CheckpointCurator) => ({
									onClick: () => setPerson(row.userId),
								})}
								rowClassName={(row: CheckpointCurator) =>
									chosenPerson === row.userId ? styles.chosen : ""
								}
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
												<CuratorRow curator={row} />
											),
										},
										{
											key: "price",
											width: 128,
											align: "right",
											render: (_: unknown, row: CheckpointCurator) => (
												<Typography.Text className={styles.price}>
													{t(
														"checkpoints.curator.amount",
														"{currency}{price}",
														{
															currency: CHECKPOINT_PRICE_CURRENCY,
															price: curatorPrice(row.level),
														},
													)}
												</Typography.Text>
											),
										},
										{
											key: "talent",
											width: 64,
											align: "center",
											render: (_: unknown, row: CheckpointCurator) => (
												// Choosing a curator and reading about one are different
												// intentions, so the row carries both.
												<Tooltip title={talentCard}>
													<Button
														type="text"
														aria-label={talentCard}
														className={styles.talent}
														icon={<IconId size={18} stroke={1.6} />}
														onClick={(event) => {
															event.stopPropagation();
															setPreview(row.specialityId);
														}}
													/>
												</Tooltip>
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
