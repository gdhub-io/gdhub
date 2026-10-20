"use client";

import {
	IconAlertCircle,
	IconCheck,
	IconFlag,
	IconMinus,
} from "@tabler/icons-react";
import { T, useTranslate } from "@tolgee/react";
import { App, Button, Card, Flex, Form, Skeleton, Typography } from "antd";
import { isAxiosError } from "axios";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { EvidenceSlot } from "@/components/checkpoints/EvidenceSlot";
import { entryProjectHref } from "@/components/checkpoints/entry/hrefs";
import {
	ClickwrapField,
	clickwrapFieldName,
	legalAcceptances,
	outdatedLegalCode,
} from "@/components/legal/ClickwrapField";
import { EmptyState, IconTile } from "@/components/ui";
import {
	AI_PLAN_DAYS,
	CHECKPOINT_DAYS,
	CHECKPOINT_LARGE_TEAM_EMAIL,
	CHECKPOINT_MAX_TEAM,
	CHECKPOINT_PRICE_CURRENCY,
} from "@/config/checkpoint";
import type { LegalCode } from "@/config/legal/registry";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
} from "@/config/prisma-enums";
import { isSlotTaken } from "@/hooks/advisor-availability";
import { useCheckpointCheckout } from "@/hooks/checkpoints";
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
	const router = useRouter();
	const { go, exit } = usePrepareNav();
	const { draft, project, loading } = useCheckpointDraft();
	const team = useTeamHours(project?.team?.id);
	const checkout = useCheckpointCheckout(draft?.id);
	const { price, curator: chosen } = useCheckpointPrice(draft);
	const [form] = Form.useForm();
	const [stale, setStale] = useState<LegalCode | null>(null);

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
						{t("checkout.backToPlan", "Back to your checkpoint plan")}
					</Button>
				}
			/>
		);
	}

	// What's done so far is item 2 of the hub, so its Edit leaves the wizard for it.
	const editDone = () => router.push(entryProjectHref(project?.slug));

	const block = (
		label: string,
		edit: PurchaseStep | (() => void),
		body: ReactNode,
	) => (
		<Flex vertical gap={8} className={styles.block}>
			<Flex justify="space-between" align="baseline">
				<Typography.Text className={styles.blockLabel}>{label}</Typography.Text>
				<Button
					type="link"
					className={styles.edit}
					onClick={() => (typeof edit === "function" ? edit() : go(edit))}
				>
					{t("checkpoints.pay.edit", "Edit")}
				</Button>
			</Flex>
			{body}
		</Flex>
	);

	const isAI = draft.curatorKind === CheckpointCuratorKind.AI;
	const doneSoFar = draft.items
		.filter((item) => item.kind === CheckpointItemKind.Input)
		.sort((a, b) => a.order - b.order);
	const amount = `${CHECKPOINT_PRICE_CURRENCY}${price}`;

	// Stripe hosts the payment, so leaving the app is the last thing this step
	// does; what comes back is a webhook, not this tab.
	const pay = async () => {
		try {
			await form.validateFields();
		} catch {
			return;
		}
		try {
			setStale(null);
			const { url } = await checkout.mutateAsync(
				legalAcceptances(["CheckpointPurchaseTerms"]),
			);
			window.location.href = url;
		} catch (error) {
			const outdated = outdatedLegalCode(error);
			if (outdated) {
				form.setFieldValue(clickwrapFieldName(outdated), false);
				setStale(outdated);
				return;
			}
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
			// The server refuses a draft without a goal or without what's done so far.
			if (isAxiosError(error) && error.response?.status === 400) {
				const refusals: Record<string, string> = {
					purchaseClosed: t(
						"checkpointEntry.closed",
						"Checkpoints open soon — we'll email you when you can head for one.",
					),
					underage: t(
						"checkpointEntry.about.underage",
						"You need to be 18 or over to head for a checkpoint",
					),
					teamTooLarge: t(
						"checkpoints.pay.teamTooLarge",
						"A team over {max} gets its own offer — write to {email}.",
						{ max: CHECKPOINT_MAX_TEAM, email: CHECKPOINT_LARGE_TEAM_EMAIL },
					),
				};
				message.warning(
					refusals[error.response.data?.error] ??
						t(
							"checkpoints.pay.incomplete",
							"The goal or what's done so far is missing — fill it in first.",
						),
				);
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
				"checkpoints.pay.termNoBuild",
				"The curator does not build any part of the game — that is your team's work.",
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
						t("checkpointEntry.done.label", "What's done so far"),
						editDone,
						<Flex vertical gap={8}>
							{doneSoFar.map((item) => (
								<Flex
									key={item.id}
									gap={12}
									align="center"
									justify="space-between"
								>
									<Typography.Text>{item.text}</Typography.Text>
									<EvidenceSlot artifact={item.artifact} />
								</Flex>
							))}
						</Flex>,
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

					<Form form={form} className={styles.clickwraps}>
						<ClickwrapField
							code="CheckpointPurchaseTerms"
							stale={stale === "CheckpointPurchaseTerms"}
							requiredMessage={t(
								"legal.clickwrap.CheckpointPurchaseTerms.required",
								"You need to accept the Checkpoint Purchase Terms to pay",
							)}
							label={(doc) => (
								<T
									keyName="legal.clickwrap.CheckpointPurchaseTerms.label"
									defaultValue="I am 18 or over and accept the <doc>Checkpoint Purchase Terms</doc>"
									params={{ doc }}
								/>
							)}
						/>
						<ClickwrapField
							code="CheckpointPurchaseTerms"
							name="startNow"
							requiredMessage={t(
								"legal.clickwrap.startNow.required",
								"Ask for the checkpoint to start now to pay",
							)}
							label={(doc) => (
								<T
									keyName="legal.clickwrap.startNow.label"
									defaultValue="I ask for the checkpoint to start before the 14-day withdrawal period ends. If I withdraw, I pay for what was already provided, and once it is fully provided I can no longer withdraw (<doc>Purchase Terms, 5.2</doc>)"
									params={{ doc }}
								/>
							)}
						/>
					</Form>

					<Button
						type="primary"
						size="large"
						block
						loading={checkout.isPending}
						onClick={pay}
					>
						{t("checkout.payment.pay", "Pay {amount}", { amount })}
					</Button>
				</Card>
			</Flex>
		</PurchaseLayout>
	);
}
