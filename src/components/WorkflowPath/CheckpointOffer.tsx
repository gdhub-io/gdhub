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
import { IconTile, StatusDot, type StatusTone } from "@/components/ui";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_MIN_CURATOR_PRICE,
	CHECKPOINT_PRICE_CURRENCY,
} from "@/config/checkpoint-pricing";
import { CheckpointStatus } from "@/config/prisma-enums";
import { useCancelCheckpoint, useDiscardCheckpoint } from "@/hooks/checkpoints";
import { SPRINTS_PER_CHECKPOINT } from "@/lib/checkpoint-sprints";
import { CHECKPOINT_DAYS } from "@/schemas/checkpoint";
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
	/** Whether any checkpoint has run before: the copy says "first" until one has. */
	first: boolean;
	/** Purchase is not open yet: the offer shows, its button does not work. */
	locked?: boolean;
};

/**
 * Frames 02 and 02.1 (`xBn27`, `X63RjU`): the way into a checkpoint from the
 * current stage. With nothing started it is the offer; once a draft exists it
 * is that draft, in whichever of its four states it is, with the ⋮ menu (02.2).
 */
export function CheckpointOffer({
	project,
	draft,
	first,
	locked = false,
}: CheckpointOfferProps) {
	const { t } = useTranslate();
	const { message, modal } = App.useApp();
	const router = useRouter();
	const discard = useDiscardCheckpoint();
	const cancel = useCancelCheckpoint(draft?.id, project.id);
	const [confirmDiscard, setConfirmDiscard] = useState(false);

	const purchase = `/user/project/${project.slug}/workflow/cp/new`;

	// What a checkpoint is, the same three lines on the offer and on its draft.
	const facts = (
		<Flex gap={20} className={styles.offerFacts}>
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
		// The purchase page opens the draft itself.
		const start = () => router.push(purchase);

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
			<Flex vertical gap={20} className={styles.offer}>
				<Flex gap={16} align="center">
					<Flex vertical gap={4} className={styles.grow}>
						<span className={styles.title}>
							{first
								? t("workflow.offer.title", "Head for your first checkpoint")
								: t("workflow.offer.titleNext", "Head for the next checkpoint")}
						</span>
						<Typography.Text type="secondary">
							{t(
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
							className={styles.offerButton}
							disabled={locked}
							icon={locked ? <IconLock size={16} /> : undefined}
							onClick={start}
						>
							{t("workflow.offer.start", "Get started")}
						</Button>
					</Tooltip>
				</Flex>
				{facts}
				<Flex gap={10} align="center" className={styles.offerOptions}>
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
			: "now";
	const stepName = {
		now: t("checkpoints.prepare.step.now", "Now"),
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
						href: `${purchase}?step=ready`,
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
							href: `${purchase}?step=payment`,
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
								number: ["now", "curator", "payment"].indexOf(savedAt) + 1,
							},
						),
						action: {
							label: t("workflow.draft.continue", "Continue setup"),
							href: `${purchase}?step=${savedAt}`,
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
						onClick: () => router.push(`${purchase}?step=ready`),
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
		<Flex vertical gap={20} className={styles.offer}>
			<Flex gap={16} align="flex-start">
				<Flex vertical gap={4} className={styles.grow}>
					<Flex gap={12} align="center" wrap>
						<span className={styles.title}>
							{first
								? t("workflow.draft.first", "Your first checkpoint")
								: t("workflow.draft.next", "Your next checkpoint")}
						</span>
						<StatusDot tone={state.tone} label={state.label} />
					</Flex>
					<Typography.Text type="secondary">{state.note}</Typography.Text>
				</Flex>
				{action && (
					<Button
						type="primary"
						className={styles.offerButton}
						onClick={() => router.push(action.href)}
					>
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
		</Flex>
	);
}
