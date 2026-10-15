"use client";

import {
	IconAlertCircle,
	IconCheck,
	IconFlag,
	IconMinus,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { App, Button, Card, Checkbox, Flex, Skeleton, Typography } from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { EmptyState, IconTile } from "@/components/ui";
import {
	AI_PLAN_DAYS,
	CHECKPOINT_DAYS,
	CHECKPOINT_PRICE_CURRENCY,
} from "@/config/checkpoint";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { isSlotTaken } from "@/hooks/advisor-availability";
import {
	useCheckpointCheckout,
	useUpdateCheckpoint,
} from "@/hooks/checkpoints";
import { hoursSpan, teamCapacity } from "@/lib/checkpoint-capacity";
import { dueDateFrom, utcStartOfDay } from "@/lib/checkpoint-days";
import { CuratorBadge } from "../CuratorBadge";
import { CuratorRow } from "./CuratorRow";
import styles from "./PaymentStep.module.scss";
import { usePrepareNav } from "./PrepareNav";
import { PurchaseLayout, type PurchaseStep } from "./PurchaseLayout";
import { useTeamHours } from "./teamHours";
import { useCheckpointDraft, useCheckpointPrice } from "./useDraft";

/**
 * Frames 05 and 05.1 (`ffbRA`, `C4c18X`): everything read back, what it costs
 * and what it does not promise.
 *
 * The terms are on this screen and nowhere else. Money is shown once, before it
 * is spent, so this is the only place the author can read what they are and are
 * not buying, and the only place it can be refused.
 */
export function PaymentStep() {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const { go, exit } = usePrepareNav();
	const { draft, project, loading } = useCheckpointDraft();
	const team = useTeamHours(project?.team?.id);
	const update = useUpdateCheckpoint(draft?.id);
	const checkout = useCheckpointCheckout(draft?.id);
	const { price, curator: chosen } = useCheckpointPrice(draft);

	if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;

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

	const block = (label: string, edit: PurchaseStep, body: ReactNode) => (
		<Flex vertical gap={8} className={styles.block}>
			<Flex justify="space-between" align="baseline">
				<Typography.Text className={styles.blockLabel}>{label}</Typography.Text>
				<Button type="link" className={styles.edit} onClick={() => go(edit)}>
					{t("checkpoints.pay.edit", "Edit")}
				</Button>
			</Flex>
			{body}
		</Flex>
	);

	const isAI = draft.curatorKind === CheckpointCuratorKind.AI;
	const amount = `${CHECKPOINT_PRICE_CURRENCY}${price}`;

	// Stripe hosts the payment, so leaving the app is the last thing this step
	// does; what comes back is a webhook, not this tab.
	const pay = async () => {
		try {
			const { url } = await checkout.mutateAsync();
			window.location.href = url;
		} catch (error) {
			if (isSlotTaken(error)) {
				message.warning(
					t(
						"checkpoints.firstCall.takenPay",
						"That first call was just taken. Pick another time.",
					),
				);
				go("curator");
				return;
			}
			message.error(
				t("checkpoints.pay.checkoutFailed", "Could not open the checkout"),
			);
		}
	};

	const capacity = teamCapacity(
		team.members.map((row) => ({ timeForWork: team.statedFor(row) })),
	);

	const firstCall = draft.startedAt ? dayjs(draft.startedAt) : null;

	const runsIn = [
		draft.stageName,
		t("checkpoints.pay.checkpointNumber", "checkpoint {number}", {
			number: draft.order,
		}),
		draft.startedAt
			? `${dayjs.utc(draft.startedAt).format("D MMM")} – ${dayjs
					.utc(dueDateFrom(utcStartOfDay(new Date(draft.startedAt))))
					.format("D MMM YYYY")}`
			: t("checkpoints.pay.daysFromDayOne", "{count} days from day 1", {
					count: CHECKPOINT_DAYS,
				}),
	].join(" · ");

	const terms = [
		{
			Icon: IconCheck,
			tone: "yes",
			text: isAI
				? t(
						"checkpoints.curator.aiWritten",
						"Written feedback every sprint, a final verdict, clear deadlines and reminders.",
					)
				: t(
						"checkpoints.curator.expertCalls",
						"A call every sprint, a final verdict, clear deadlines and reminders.",
					),
		},
		{
			Icon: IconMinus,
			tone: "no",
			text: t(
				"checkpoints.pay.termTeam",
				"Your team does the work; the curator keeps the 28 days on track.",
			),
		},
		{
			Icon: IconMinus,
			tone: "note",
			// The AI curator holds no calls: its tasks come from the review page.
			text: isAI
				? t(
						"checkpoints.pay.termTasksAi",
						"Tasks are set in the first {days} days, with the AI's advice. Results are not guaranteed.",
						{ days: AI_PLAN_DAYS },
					)
				: t(
						"checkpoints.pay.termTasks",
						"Tasks are set together on the first call. Results are not guaranteed.",
					),
		},
	];

	return (
		<PurchaseLayout
			title={t("checkpoints.pay.title", "Check and pay")}
			hint={t("checkout.payment.hint", "Nothing is charged until you confirm.")}
			notice={
				draft.paymentFailed && (
					<Flex gap={16} align="center" className={styles.failed}>
						<IconTile
							icon={IconAlertCircle}
							size="md"
							tint="var(--gd-color-surface)"
							ink="var(--gd-danger-solid)"
						/>
						<Flex vertical gap={4}>
							<Typography.Text strong>
								{t(
									"checkpoints.pay.failedTitle",
									"The payment did not go through",
								)}
							</Typography.Text>
							<Typography.Text type="secondary">
								{t(
									"checkpoints.pay.failedBody",
									"Try the payment again, or pay with another card.",
								)}
							</Typography.Text>
						</Flex>
					</Flex>
				)
			}
			onBack={() => go("curator")}
		>
			<Flex gap={48} align="flex-start" className={styles.split}>
				<Flex vertical gap={24} className={styles.summary}>
					{block(
						t("checkpoints.pay.runsIn", "Runs in"),
						"curator",
						<Typography.Text>{runsIn}</Typography.Text>,
					)}

					{!isAI &&
						firstCall &&
						block(
							t("checkpoints.pay.calls", "Calls with {name}", {
								name: draft.curator?.name?.split(" ")[0] ?? "",
							}),
							"curator",
							<Typography.Text>
								{t(
									"checkpoints.pay.callsWhen",
									"{weekday}s at {time} · {from} – {to} · five calls",
									{
										weekday: firstCall.format("dddd"),
										time: firstCall.format("HH:mm"),
										from: firstCall.format("D MMM"),
										to: firstCall.add(CHECKPOINT_DAYS, "day").format("D MMM"),
									},
								)}
							</Typography.Text>,
						)}

					{block(
						t("checkpoints.pay.capacity", "Team capacity"),
						"goal",
						<Typography.Text className={styles.figure}>
							{capacity.hoursPerWeek && capacity.hoursPerRun
								? t(
										"checkpoints.pay.capacityHours",
										"{week} hours per sprint · {run} hours over 28 days",
										{
											week: hoursSpan(capacity.hoursPerWeek),
											run: hoursSpan(capacity.hoursPerRun),
										},
									)
								: t(
										"checkpoints.pay.capacityUnknown",
										"Nobody has stated their hours yet",
									)}
						</Typography.Text>,
					)}

					{block(
						t("checkpoints.pay.want", "What you want in 28 days"),
						"goal",
						<Typography.Text>{draft.goal}</Typography.Text>,
					)}

					{block(
						t("checkpoints.pay.curator", "Curator"),
						"curator",
						// Shown back as the line it was picked from, so it reads the
						// same on both screens.
						chosen ? (
							<div className={styles.curator}>
								<CuratorRow curator={chosen} />
							</div>
						) : (
							<CuratorBadge kind={draft.curatorKind} curator={draft.curator} />
						),
					)}
				</Flex>

				<Card className={styles.price}>
					<Flex justify="space-between" align="baseline">
						<Typography.Text className={styles.priceLabel}>
							{t("checkpoints.pay.priceLabel", "Price")}
						</Typography.Text>
						<Typography.Text className={styles.total}>{amount}</Typography.Text>
					</Flex>

					<Flex vertical gap={12} className={styles.terms}>
						<Typography.Text strong>
							{t("checkpoints.pay.whatYouGet", "What the curator does")}
						</Typography.Text>
						{terms.map(({ Icon, tone, text }) => (
							<Flex key={tone} gap={12} align="flex-start">
								<span className={styles.termIcon} data-tone={tone}>
									<Icon size={16} />
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
						{t("checkpoints.pay.accept", "I accept the checkpoint agreement.")}
					</Checkbox>

					<Button
						type="primary"
						size="large"
						block
						loading={checkout.isPending}
						disabled={!draft.acceptedTermsAt}
						onClick={pay}
					>
						{t("checkout.payment.pay", "Pay {amount}", { amount })}
					</Button>
				</Card>
			</Flex>
		</PurchaseLayout>
	);
}
