import {
	IconCalendarCheck,
	IconCircleX,
	IconDotsVertical,
	IconInfoCircle,
	IconLock,
	IconMessage2,
	IconRoute,
	IconSparkles,
	IconTrash,
	IconUserCog,
	IconVideo,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Dropdown, Flex, Modal, Tooltip, Typography } from "antd";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import {
	checkoutHref,
	entryHubHref,
} from "@/components/checkpoints/entry/hrefs";
import { ReplaceCuratorModal } from "@/components/checkpoints/PaidPanel/ReplaceCuratorModal";
import { PURCHASE_STEPS } from "@/components/checkpoints/start/PurchaseLayout";
import { useVerdictCopy } from "@/components/checkpoints/VerdictChip";
import { IconTile, StatusDot, type StatusTone } from "@/components/ui";
import { curatorKindParam } from "@/config/analytics-events";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_DAYS,
	CHECKPOINT_PRICE_CURRENCY,
	SPRINTS_PER_CHECKPOINT,
} from "@/config/checkpoint";
import { CHECKPOINT_MIN_CURATOR_PRICE } from "@/config/checkpoint-pricing";
import { CheckpointStatus } from "@/config/prisma-enums";
import { trackCheckpoint } from "@/helpers/gtm";
import {
	useCancelCheckpoint,
	useCheckpoint,
	useDiscardCheckpoint,
} from "@/hooks/checkpoints";
import type { CheckpointDto } from "@/types/checkpoints";
import styles from "./style.module.scss";

/** One fact of the offer: an icon on a muted tile and a short line. */
const fact = (icon: ReactNode, label: ReactNode) => (
	<Flex gap={8} align="center" className={styles.offerFact}>
		<span className={styles.offerFactIcon}>{icon}</span>
		<span className={styles.offerFactLabel}>{label}</span>
	</Flex>
);

export type CheckpointOfferProps = {
	project: { id: string; slug: string };
	/** The project's unfinished checkpoint: a draft, or one paid and not yet running. */
	draft: CheckpointDto | null;
	/** The last closed checkpoint; until one exists the copy says "first". */
	previous: { checkpoint: CheckpointDto; number: number } | null;
	/** Purchase is not open yet: the offer shows, its button does not work. */
	locked?: boolean;
};

/**
 * Frames 02, 02.1 and 02.4 (`xBn27`, `X63RjU`, `fEOsj`): the way into a checkpoint from the
 * current stage. With nothing started it is the offer; once a draft exists it
 * is that draft, in whichever of its four states it is, with the ⋮ menu (02.2).
 */
export function CheckpointOffer({
	project,
	draft,
	previous,
	locked = false,
}: CheckpointOfferProps) {
	const { t } = useTranslate();
	const { label: verdictLabel } = useVerdictCopy();
	const { message, modal } = App.useApp();
	const router = useRouter();
	const discard = useDiscardCheckpoint();
	const cancel = useCancelCheckpoint(draft?.id, project.id);
	const [confirmDiscard, setConfirmDiscard] = useState(false);
	const [replacing, setReplacing] = useState(false);
	// The list leaves out the held price a replacement must match; only a paid
	// checkpoint can be handed over, so only that one is read in full.
	const { data: detail } = useCheckpoint(
		draft?.paymentId ? draft.id : undefined,
	);

	// What a checkpoint is, the same three lines on the offer and on its draft.
	const facts = (
		<Flex gap={24} className={styles.offerFacts}>
			{fact(
				<IconCalendarCheck size={16} />,
				t("workflow.offer.factSprints", "{count} weekly sprints", {
					count: SPRINTS_PER_CHECKPOINT,
				}),
			)}
			{fact(
				<IconMessage2 size={16} />,
				t("workflow.offer.factFeedback", "Feedback that moves you"),
			)}
			{fact(
				<IconRoute size={16} />,
				t("workflow.offer.factNext", "A clear next step"),
			)}
		</Flex>
	);

	if (!draft) {
		const plan = () => {
			trackCheckpoint("checkpoint_next_planned", {
				next_number: previous ? previous.number + 1 : 1,
				verdict: previous?.checkpoint.verdict ?? null,
				previous_curator_kind: previous
					? curatorKindParam(previous.checkpoint.curatorKind)
					: null,
			});
			router.push(entryHubHref(project.slug));
		};

		const option = (
			icon: ReactNode,
			name: string,
			note: string,
			price: string,
		) => (
			<Flex gap={12} align="flex-start" className={styles.offerOption}>
				<span className={styles.offerOptionIcon}>{icon}</span>
				<Flex vertical gap={4} className={styles.grow}>
					<Typography.Text strong>{name}</Typography.Text>
					<Typography.Text type="secondary" className={styles.small}>
						{note}
					</Typography.Text>
				</Flex>
				<Typography.Text strong className={styles.offerPrice}>
					{price}
				</Typography.Text>
			</Flex>
		);

		return (
			<Flex vertical gap={24} className={styles.offer}>
				<Flex gap={16} align="center">
					<Flex vertical gap={4} className={styles.grow}>
						<span className={styles.title}>
							{previous
								? t(
										"workflow.offer.titleNumber",
										"Head for Checkpoint {number}",
										{
											number: String(previous.number + 1),
										},
									)
								: t("workflow.offer.title", "Head for your first checkpoint")}
						</span>
						<Typography.Text type="secondary">
							{previous?.checkpoint.verdict
								? t(
										"workflow.offer.subtitleAfter",
										"Checkpoint {number} closed: {verdict}. Set the next goal.",
										{
											number: String(previous.number),
											verdict: verdictLabel(previous.checkpoint.verdict),
										},
									)
								: t(
										"workflow.offer.subtitle",
										"{days} days toward one goal, with a curator beside you.",
										{ days: CHECKPOINT_DAYS },
									)}
						</Typography.Text>
					</Flex>
					<Tooltip
						title={
							locked && t("workflow.offer.locked", "Checkpoints open soon")
						}
					>
						<Button
							type="primary"
							disabled={locked}
							icon={locked ? <IconLock size={16} /> : undefined}
							onClick={plan}
						>
							{previous
								? t("workflow.after.plan", "Plan Checkpoint {number}", {
										number: String(previous.number + 1),
									})
								: t("workflow.offer.plan", "Plan this checkpoint")}
						</Button>
					</Tooltip>
				</Flex>
				{facts}
				<Flex gap={12} align="center" className={styles.offerOptions}>
					{option(
						<IconSparkles size={16} />,
						t("checkpoints.curator.ai", "AI curator"),
						t(
							"checkpoints.curator.aiWritten",
							"Written feedback every sprint, a final verdict, clear deadlines and reminders.",
						),
						`${CHECKPOINT_PRICE_CURRENCY}${CHECKPOINT_AI_PRICE}`,
					)}
					<span className={styles.offerOr}>{t("workflow.offer.or", "or")}</span>
					{option(
						<IconVideo size={16} />,
						t("workflow.offer.industry", "Industry curator"),
						t(
							"checkpoints.curator.expertCalls",
							"A call every sprint, a final verdict, clear deadlines and reminders.",
						),
						t("workflow.offer.from", "from {price}", {
							price: `${CHECKPOINT_PRICE_CURRENCY}${CHECKPOINT_MIN_CURATOR_PRICE}`,
						}),
					)}
				</Flex>
			</Flex>
		);
	}

	const paid = !!draft.paymentId;
	const waiting = draft.status === CheckpointStatus.AwaitingCurator;
	const declined = !waiting && !!draft.curatorDeclinedAt && !draft.curator;
	const curatorName = draft.curator?.name?.split(" ")[0] ?? "";

	// Where the setup stopped: the step it needs next.
	const savedAt = draft.acceptedTermsAt
		? "payment"
		: draft.goal.trim()
			? "curator"
			: "goal";
	const stepName = {
		goal: t("checkout.step.goal", "Goal"),
		curator: t("checkpoints.prepare.step.curator", "Curator"),
		payment: t("checkpoints.prepare.step.payment", "Payment"),
	}[savedAt];

	const state: {
		tone: StatusTone;
		label: string;
		note: string;
		action?: { label: string; href: string };
	} = waiting
		? {
				tone: "warning",
				label: t("workflow.draft.waiting", "Waiting for the curator"),
				note: t(
					"workflow.draft.email",
					"We'll email you as soon as {name} decides.",
					{ name: curatorName },
				),
			}
		: declined
			? {
					tone: "danger",
					label: t("workflow.draft.declined", "Curator declined"),
					note: t(
						"workflow.draft.declinedNote",
						"The curator can't take it on right now. Pick another curator — the payment moves with it.",
					),
					action: {
						label: t("checkpoints.paid.pickAnother", "Pick another curator"),
						href: checkoutHref(project.slug, "ready"),
					},
				}
			: draft.paymentFailed
				? {
						tone: "danger",
						label: t("workflow.draft.failed", "Payment failed"),
						note: t(
							"workflow.draft.failedNote",
							"Try again, or pay with another card. Nothing was charged.",
						),
						action: {
							label: t("workflow.draft.tryAgain", "Try again"),
							href: checkoutHref(project.slug, "payment"),
						},
					}
				: {
						tone: "neutral",
						label: t("workflow.draft.draft", "Draft"),
						note: t(
							"workflow.draft.savedAt",
							"Saved at {step} · step {number} of 3",
							{
								step: stepName,
								number: PURCHASE_STEPS.indexOf(savedAt) + 1,
							},
						),
						action: {
							label: t("workflow.draft.continue", "Continue setup"),
							href: checkoutHref(project.slug, savedAt),
						},
					};

	const { action } = state;

	const cancelPaid = () =>
		modal.confirm({
			title: t("checkpoints.paid.cancelTitle", "Cancel this checkpoint?"),
			content: t(
				"workflow.draft.refundNote",
				"The money is returned in full and the checkpoint is deleted along with what you wrote for it.",
			),
			okText: t("checkpoints.paid.cancelOk", "Cancel and refund"),
			okButtonProps: { danger: true },
			cancelText: t("checkpoints.paid.cancelKeep", "Keep it"),
			onOk: () =>
				cancel
					.mutateAsync()
					.catch(() =>
						message.error(
							t(
								"checkpoints.paid.cancelFailed",
								"The checkpoint was not cancelled",
							),
						),
					),
		});

	const menu = [
		...(waiting || declined
			? [
					{
						key: "replace",
						icon: <IconUserCog size={16} />,
						label: t("workflow.draft.replace", "Replace the curator"),
						onClick: () => setReplacing(true),
					},
				]
			: []),
		{
			key: "cancel",
			danger: true,
			icon: <IconCircleX size={16} />,
			label: t("workflow.draft.cancel", "Cancel the checkpoint"),
			onClick: () => (paid ? cancelPaid() : setConfirmDiscard(true)),
		},
	];

	return (
		<Flex vertical gap={24} className={styles.offer}>
			<Flex gap={16} align="flex-start">
				<Flex vertical gap={4} className={styles.grow}>
					<Flex gap={12} align="center" wrap>
						<span className={styles.title}>
							{!previous
								? t("workflow.draft.first", "Your first checkpoint")
								: t("workflow.draft.next", "Your next checkpoint")}
						</span>
						<StatusDot tone={state.tone} label={state.label} />
					</Flex>
					<Typography.Text type="secondary">{state.note}</Typography.Text>
				</Flex>
				{action && (
					<Button type="primary" onClick={() => router.push(action.href)}>
						{action.label}
					</Button>
				)}
				<Dropdown
					menu={{ items: menu }}
					trigger={["click"]}
					placement="bottomRight"
				>
					<Button
						type="text"
						icon={<IconDotsVertical size={20} />}
						aria-label={t("workflow.draft.more", "More")}
					/>
				</Dropdown>
			</Flex>
			{facts}

			<Modal
				open={confirmDiscard}
				onCancel={() => setConfirmDiscard(false)}
				width={520}
				footer={
					<Flex justify="space-between" align="center">
						<Typography.Text type="secondary" className={styles.small}>
							{t("workflow.draft.nothingCharged", "Nothing was charged.")}
						</Typography.Text>
						<Flex gap={8}>
							<Button onClick={() => setConfirmDiscard(false)}>
								{t("workflow.draft.keep", "Keep the draft")}
							</Button>
							<Button
								type="primary"
								danger
								loading={discard.isPending}
								onClick={() =>
									discard
										.mutateAsync(draft.id)
										.then(() => setConfirmDiscard(false))
										.catch(() =>
											message.error(
												t(
													"workflow.draft.discardFailed",
													"The draft was not cancelled",
												),
											),
										)
								}
							>
								{t("workflow.draft.discard", "Cancel the draft")}
							</Button>
						</Flex>
					</Flex>
				}
			>
				<Flex gap={16} align="flex-start">
					<IconTile
						icon={IconTrash}
						size="md"
						tint="var(--gd-danger-tint)"
						ink="var(--gd-danger-solid)"
					/>
					<Flex vertical gap={8}>
						<span className={styles.dialogTitle}>
							{t("workflow.draft.discardTitle", "Cancel this draft?")}
						</span>
						<Typography.Text type="secondary">
							{t(
								"workflow.draft.discardNote",
								"All three steps will be deleted permanently.",
							)}
						</Typography.Text>
						<Flex gap={8} align="center">
							<IconInfoCircle size={16} className={styles.tertiary} />
							<Typography.Text type="secondary" className={styles.small}>
								{t(
									"workflow.draft.discardKeep",
									"Leaving this page keeps the draft.",
								)}
							</Typography.Text>
						</Flex>
					</Flex>
				</Flex>
			</Modal>

			{detail && (
				<ReplaceCuratorModal
					checkpointId={detail.id}
					currentCuratorId={detail.curator?.id}
					unavailable={detail.declinedCuratorIds}
					price={detail.heldPrice}
					stage={detail.stageName}
					open={replacing}
					onClose={() => setReplacing(false)}
				/>
			)}
		</Flex>
	);
}
