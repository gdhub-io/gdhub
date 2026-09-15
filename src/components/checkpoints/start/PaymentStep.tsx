"use client";

import {
	IconCheck,
	IconFlag,
	IconInfoCircle,
	IconX,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Checkbox, Flex, Skeleton, Typography } from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_HUMAN_PRICE_FROM,
	CHECKPOINT_PRICE_CURRENCY,
} from "@/config/checkpoint-pricing";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
} from "@/config/prisma-enums";
import { useDiscardCheckpoint, useUpdateCheckpoint } from "@/hooks/checkpoints";
import { CHECKPOINT_DAYS } from "@/schemas/checkpoint";
import type { CheckpointItemDto } from "@/types/checkpoints";
import { CuratorBadge } from "../CuratorBadge";
import styles from "./PaymentStep.module.scss";
import { usePrepareNav } from "./PrepareNav";
import { StartLayout, type StartStep } from "./StartLayout";
import { useCheckpointDraft } from "./useDraft";

/**
 * Step 4: everything read back, what it costs, and what it does not promise
 * (frame `B2XH9`).
 *
 * The terms are on this screen and nowhere else. Money is shown once, before it
 * is spent, and the checkpoint never mentions it again — so this is the only
 * place the author can read what they are and are not buying, and the only place
 * it can be refused.
 */
export function PaymentStep() {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const { go, exit } = usePrepareNav();
	const { draft, loading } = useCheckpointDraft();
	const discard = useDiscardCheckpoint();
	const update = useUpdateCheckpoint(draft?.id);

	if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;

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

	const side = (kind: CheckpointItemKind) =>
		draft.items.filter((item: CheckpointItemDto) => item.kind === kind);

	const block = (label: string, edit: StartStep | null, body: ReactNode) => (
		<Flex vertical gap={8} className={styles.block}>
			<Flex justify="space-between" align="baseline">
				<Typography.Text className={styles.blockLabel}>{label}</Typography.Text>
				{edit && (
					<Button type="link" className={styles.edit} onClick={() => go(edit)}>
						{t("checkpoints.pay.edit", "Edit")}
					</Button>
				)}
			</Flex>
			{body}
		</Flex>
	);

	const list = (items: CheckpointItemDto[]) =>
		items.length === 0 ? (
			<Typography.Text type="secondary">
				{t("checkpoints.goal.sideEmpty", "Nothing listed")}
			</Typography.Text>
		) : (
			<Flex vertical gap={6}>
				{items.map((item) => (
					<Flex key={item.id} gap={10} align="baseline">
						<span className={styles.dot} />
						<Typography.Text>{item.text}</Typography.Text>
					</Flex>
				))}
			</Flex>
		);

	const isAI = draft.curatorKind === CheckpointCuratorKind.AI;

	return (
		<StartLayout
			step="payment"
			question={t("checkpoints.start.q4", "Ready to start?")}
			hint={t(
				"checkpoints.start.h4",
				"Read it back before you pay. After this the goal card is fixed until day 14.",
			)}
			onBack={() => go("when")}
			onCancel={cancel}
			footNote={
				<Typography.Text type="secondary" className={styles.pending}>
					{t("checkpoints.start.payPending", "Checkout is not open yet")}
				</Typography.Text>
			}
			forward={
				<Button type="primary" disabled>
					{t("checkpoints.pay.payAndStart", "Pay and start")}
				</Button>
			}
		>
			<Flex vertical gap={24} className={styles.summary}>
				{block(
					t("checkpoints.pay.runsIn", "Runs in"),
					null,
					<Typography.Text>
						{[
							draft.stageName,
							t("checkpoints.number", "Checkpoint {number}", {
								number: draft.order,
							}),
							t("checkpoints.pay.days", "{count} days from the start", {
								count: CHECKPOINT_DAYS,
							}),
						].join(" · ")}
					</Typography.Text>,
				)}

				{block(
					t("checkpoints.pay.whatExists", "What exists now"),
					"now",
					list(side(CheckpointItemKind.Input)),
				)}

				{block(
					t("checkpoints.pay.whatMustExist", "What must exist by day 28"),
					"goal",
					list(side(CheckpointItemKind.Outcome)),
				)}

				{block(
					t("checkpoints.pay.curator", "Curator"),
					"curator",
					<CuratorBadge kind={draft.curatorKind} curator={draft.curator} />,
				)}
			</Flex>

			<div className={styles.price}>
				{isAI ? (
					<Flex justify="space-between" className={styles.total}>
						<Typography.Text>
							{t("checkpoints.curator.aiName", "AI curator, in writing")}
						</Typography.Text>
						<Typography.Text>{`${CHECKPOINT_PRICE_CURRENCY}${CHECKPOINT_AI_PRICE}`}</Typography.Text>
					</Flex>
				) : (
					<Flex vertical gap={8}>
						<Flex justify="space-between" className={styles.total}>
							<Typography.Text>
								{t("checkpoints.pay.fromPrice", "From")}
							</Typography.Text>
							<Typography.Text>{`${CHECKPOINT_PRICE_CURRENCY}${CHECKPOINT_HUMAN_PRICE_FROM}`}</Typography.Text>
						</Flex>
						<Typography.Text type="secondary">
							{t(
								"checkpoints.pay.humanPriceNote",
								"The price is their hourly rate against the hours a checkpoint takes — 7.5 for you plus half an hour for each of the team — and the platform's 40%. It is settled once a curator takes this on.",
							)}
						</Typography.Text>
					</Flex>
				)}

				<Flex vertical gap={10} className={styles.terms}>
					<Typography.Text className={styles.termsHead}>
						{t("checkpoints.pay.whatYouGet", "What the curator does")}
					</Typography.Text>
					{[
						{
							Icon: IconCheck,
							tone: "yes",
							text: t(
								"checkpoints.pay.term1",
								"Five consultations and a verdict by day 30.",
							),
						},
						{
							Icon: IconX,
							tone: "no",
							text: t(
								"checkpoints.pay.term2",
								"Not the game itself. The team builds it; the curator holds the 28 days to the goal and cannot reach it for you.",
							),
						},
						{
							Icon: IconInfoCircle,
							tone: "note",
							text: t(
								"checkpoints.pay.term3",
								"No promise that the goal is met. A checkpoint where the work did not happen ends in “goal missed”.",
							),
						},
					].map(({ Icon, tone, text }) => (
						<Flex key={tone} gap={8} align="flex-start">
							<span className={styles.termIcon} data-tone={tone}>
								<Icon size={15} stroke={1.8} />
							</span>
							<Typography.Text className={styles.termText}>
								{text}
							</Typography.Text>
						</Flex>
					))}
				</Flex>

				<Checkbox
					checked={!!draft.acceptedTermsAt}
					disabled={update.isPending}
					onChange={(event) =>
						update
							.mutateAsync({ acceptedTerms: event.target.checked })
							.catch(() =>
								message.error(
									t("checkpoints.goal.saveFailed", "Could not save"),
								),
							)
					}
				>
					{t(
						"checkpoints.pay.agree",
						"I have read the checkpoint standard and accept it — including what is not guaranteed.",
					)}
				</Checkbox>

				{draft.acceptedTermsAt && (
					<Typography.Text type="secondary">
						{t("checkpoints.pay.acceptedOn", "Accepted {date}", {
							date: dayjs(draft.acceptedTermsAt).format("D MMM YYYY"),
						})}
					</Typography.Text>
				)}
			</div>
		</StartLayout>
	);
}
