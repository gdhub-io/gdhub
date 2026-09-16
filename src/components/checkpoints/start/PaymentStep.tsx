"use client";

import {
	IconAlertTriangle,
	IconCheck,
	IconFlag,
	IconInfoCircle,
	IconLock,
	IconX,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	App,
	Button,
	Card,
	Checkbox,
	Flex,
	Skeleton,
	Tooltip,
	Typography,
} from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_PRICE_CURRENCY,
	curatorPrice,
} from "@/config/checkpoint-pricing";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
} from "@/config/prisma-enums";
import {
	useCheckpointCurators,
	useGoalCheck,
	useUpdateCheckpoint,
} from "@/hooks/checkpoints";
import { teamCapacity } from "@/lib/checkpoint-capacity";
import { dueDateFrom } from "@/lib/checkpoint-days";
import { CHECKPOINT_DAYS } from "@/schemas/checkpoint";
import type { CheckpointItemDto } from "@/types/checkpoints";
import { CuratorBadge } from "../CuratorBadge";
import styles from "./PaymentStep.module.scss";
import { usePrepareNav } from "./PrepareNav";
import { StartLayout, type StartStep } from "./StartLayout";
import { useTeamHours } from "./teamHours";
import { useCheckpointDraft } from "./useDraft";

/**
 * Step 5: everything read back, what it costs, and what it does not promise.
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
	const { draft, project, loading } = useCheckpointDraft();
	const team = useTeamHours(project?.team?.id);
	// What the curator is being asked about: the card, and the hours it has to be
	// done in. Anything else changing — a curator picked, a date moved — is not a
	// different question, so it does not cost another call.
	const signature = draft
		? [
				draft.goal.trim(),
				...draft.items.map((item) => `${item.kind}:${item.text}`),
				team.hours.join("-"),
			].join("|")
		: undefined;
	const { data: remark } = useGoalCheck(draft?.id, signature);
	const update = useUpdateCheckpoint(draft?.id);
	const curators = useCheckpointCurators();

	if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;

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
			<Flex vertical gap={8}>
				{items.map((item) => (
					<Flex key={item.id} gap={8} align="baseline">
						<span className={styles.dot} />
						<Typography.Text>{item.text}</Typography.Text>
					</Flex>
				))}
			</Flex>
		);

	const isAI = draft.curatorKind === CheckpointCuratorKind.AI;
	// The price follows the chosen curator's level, and the level only exists on
	// the list the previous step already loaded — the checkpoint itself keeps no
	// record of what was agreed until GDHUB-42 puts one there.
	const chosen = curators.data?.find(
		(curator) => curator.userId === draft.curator?.id,
	);
	const price =
		isAI || !chosen ? CHECKPOINT_AI_PRICE : curatorPrice(chosen.level);
	const checkoutClosed = t(
		"checkpoints.prepare.payPending",
		"Checkout is not open yet",
	);

	const capacity = teamCapacity(
		team.members.map((row) => ({ timeForWork: team.statedFor(row) })),
	);
	const span = (hours: { from: number; to: number }) =>
		hours.from === hours.to ? `${hours.from}` : `${hours.from}–${hours.to}`;

	const runsIn = [
		draft.stageName,
		t("checkpoints.number", "Checkpoint {number}", { number: draft.order }),
		draft.startedAt
			? t("checkpoints.when.runs", "Runs {from} – {to}", {
					from: dayjs.utc(draft.startedAt).format("D MMM"),
					to: dayjs
						.utc(dueDateFrom(new Date(draft.startedAt)))
						.format("D MMM YYYY"),
				})
			: t("checkpoints.pay.days", "{count} days from the start", {
					count: CHECKPOINT_DAYS,
				}),
	].join(" · ");

	// Advice, never a gate: the author can read it and pay anyway. There is no
	// positive state in the design, so a plan that reads fine says nothing.
	const atRisk = !!remark && (!remark.reachable || remark.missing.length > 0);

	return (
		<StartLayout
			step="payment"
			hint={t(
				"checkpoints.prepare.h4",
				"Review your choices, complete payment, and start working toward your next Checkpoint.",
			)}
			onBack={() => go("planning")}
		>
			{atRisk && (
				<Flex gap={16} align="flex-start" className={styles.suggestion}>
					<span className={styles.suggestionIcon}>
						<IconAlertTriangle size={20} stroke={1.6} />
					</span>
					<Flex vertical gap={4} className={styles.suggestionText}>
						<Typography.Text className={styles.suggestionLabel}>
							{t("checkpoints.pay.aiSuggestion", "AI suggestion")}
						</Typography.Text>
						<Typography.Text className={styles.suggestionTitle}>
							{t(
								"checkpoints.pay.riskTitle",
								"Your 28-day plan may be at risk",
							)}
						</Typography.Text>
						<Typography.Text className={styles.suggestionBody}>
							{t(
								"checkpoints.pay.riskBody",
								"The current outcomes may require more time than the team has available. Review the plan before payment to improve your chance of reaching this Checkpoint.",
							)}
						</Typography.Text>
					</Flex>
					<Button
						className={styles.suggestionAction}
						onClick={() => go("goal")}
					>
						{t("checkpoints.pay.adjustGoal", "Adjust the goal")}
					</Button>
				</Flex>
			)}

			<Flex vertical gap={24} className={styles.summary}>
				{block(
					t("checkpoints.pay.runsIn", "Runs in"),
					"planning",
					<Typography.Text>{runsIn}</Typography.Text>,
				)}

				{block(
					t("checkpoints.pay.capacity", "Team capacity"),
					"planning",
					<Typography.Text className={styles.figure}>
						{capacity.hoursPerWeek && capacity.hoursPerRun
							? t(
									"checkpoints.pay.capacityHours",
									"{week} hours per sprint · {run} hours over 28 days",
									{
										week: span(capacity.hoursPerWeek),
										run: span(capacity.hoursPerRun),
									},
								)
							: t(
									"checkpoints.pay.capacityUnknown",
									"Nobody has stated their hours yet",
								)}
					</Typography.Text>,
				)}

				{block(
					t("checkpoints.pay.goal", "The goal"),
					"goal",
					<Typography.Text>{draft.goal}</Typography.Text>,
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

			<Card className={styles.price}>
				<Flex vertical gap={4}>
					<Typography.Text className={styles.blockLabel}>
						{t("checkpoints.pay.priceLabel", "Price")}
					</Typography.Text>
					<Flex gap={8} align="baseline">
						<Typography.Text className={styles.total}>
							{`${CHECKPOINT_PRICE_CURRENCY}${price}`}
						</Typography.Text>
					</Flex>
					<Typography.Text type="secondary" className={styles.vat}>
						{t("checkpoints.pay.vat", "+ VAT")}
					</Typography.Text>
				</Flex>

				<Flex vertical gap={8} className={styles.terms}>
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
								<Icon size={16} stroke={1.8} />
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

				{/* The action of the whole purchase sits with the sum it commits.
				    Stripe checkout lands with GDHUB-38. */}
				<Flex gap={12} align="center">
					<Tooltip title={checkoutClosed}>
						<Button
							type="primary"
							disabled
							icon={<IconLock size={16} stroke={1.6} />}
						>
							{t("checkpoints.pay.payAndStart", "Pay and start")}
						</Button>
					</Tooltip>
					<Typography.Text type="secondary" className={styles.pending}>
						{checkoutClosed}
					</Typography.Text>
				</Flex>
			</Card>
		</StartLayout>
	);
}
