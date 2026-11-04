"use client";

import type { Icon } from "@tabler/icons-react";
import {
	IconCalendar,
	IconFlag,
	IconSparkles,
	IconUser,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	App,
	Button,
	DatePicker,
	Flex,
	Radio,
	Skeleton,
	Tag,
	Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { type ReactNode, useState } from "react";
import { EmptyState, IconTile } from "@/components/ui";
import { purchaseParams } from "@/config/analytics-events";
import {
	CHECKPOINT_AI_PRICE,
	CHECKPOINT_PRICE_CURRENCY,
	EXPERT_CHECKPOINT_OPEN,
} from "@/config/checkpoint";
import { CheckpointCuratorKind, WaitlistFeature } from "@/config/prisma-enums";
import { trackCheckpoint } from "@/helpers/gtm";
import { isSlotTaken } from "@/hooks/advisor-availability";
import {
	useCheckpointCurators,
	useUpdateCheckpoint,
} from "@/hooks/checkpoints";
import { useJoinWaitlist, useWaitlistStatus } from "@/hooks/feature-waitlist";
import { dueDateFrom, sessionDay } from "@/lib/checkpoints/days";
import { dateOfDay } from "@/lib/checkpoints/plan";
import styles from "./CuratorStep.module.scss";
import { CuratorTable } from "./CuratorTable";
import { ExpertWaitlist } from "./ExpertWaitlist";
import { FirstCallPicker } from "./FirstCallPicker";
import { usePrepareNav } from "./PrepareNav";
import { PurchaseLayout, type PurchaseStep } from "./PurchaseLayout";
import { useCheckpointDraft } from "./useDraft";

/** A row of frame 04.1's card: a label, what it says, and a quiet note. */
function SummaryRow({
	label,
	hint,
	children,
}: {
	label: string;
	hint: string;
	children: ReactNode;
}) {
	return (
		<Flex gap={16} align="center" className={styles.summaryRow}>
			<Typography.Text type="secondary" className={styles.summaryLabel}>
				{label}
			</Typography.Text>
			{children}
			<Typography.Text type="secondary" className={styles.small}>
				{hint}
			</Typography.Text>
		</Flex>
	);
}

/**
 * Frames 04 (`Ha8mK`) and 04.1 (`nhoB1`): who runs the 28 days, and from when.
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
	const curators = useCheckpointCurators(draft?.stageName);
	const [kind, setKind] = useState<CheckpointCuratorKind | null>(null);
	const [person, setPerson] = useState<string | null>(null);
	// Undefined until touched: the draft's own answer stands until then.
	const [slot, setSlot] = useState<string | null>();
	const [aiDay, setAiDay] = useState<Dayjs | null>(null);
	// Until an expert can be bought, choosing one shows the waitlist (GDHUB-107).
	const waitlisted =
		!EXPERT_CHECKPOINT_OPEN &&
		(kind ?? draft?.curatorKind) === CheckpointCuratorKind.Human;
	const waitlist = useWaitlistStatus(
		WaitlistFeature.ExpertCheckpoint,
		waitlisted,
	);
	const join = useJoinWaitlist(WaitlistFeature.ExpertCheckpoint);

	if (loading) return <Skeleton active paragraph={{ rows: 6 }} />;

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

	// The draft is opened with the AI curator, so the stored value is the choice
	// until the author touches it. A closed expert is shown, never saved.
	const chosen = kind ?? draft.curatorKind;
	const saved = waitlisted ? CheckpointCuratorKind.AI : chosen;
	const chosenPerson = person ?? draft.curator?.id ?? null;
	const isHuman = saved === CheckpointCuratorKind.Human;
	const curator = curators.data?.find((row) => row.userId === chosenPerson);
	// A first call belongs to the curator it was booked with.
	const firstCall =
		slot !== undefined
			? slot
			: draft.curatorKind === CheckpointCuratorKind.Human &&
					draft.curator?.id === chosenPerson
				? draft.startedAt
				: null;
	// A draft's day is only a wish: one already gone reads as today.
	const savedDay =
		draft.curatorKind === CheckpointCuratorKind.AI && draft.startedAt
			? dayjs.utc(draft.startedAt)
			: null;
	const startDay =
		aiDay ??
		(savedDay && !savedDay.isBefore(dayjs(), "day") ? savedDay : dayjs());
	const reviewDays = [2, 3, 4, 5].map((index) =>
		dayjs.utc(dateOfDay(startDay.format("YYYY-MM-DD"), sessionDay(index))),
	);

	const goTo = async (next: PurchaseStep) => {
		try {
			await update.mutateAsync({
				curatorKind: saved,
				// The AI curator is nobody in particular, so choosing it lets the
				// person go rather than leaving a stale name on the draft.
				curatorId: isHuman ? chosenPerson : null,
				startedAt: isHuman ? firstCall : startDay.format("YYYY-MM-DD"),
			});
			if (next === "payment") {
				trackCheckpoint(
					"checkpoint_curator_chosen",
					purchaseParams(
						{ ...draft, curatorKind: saved },
						isHuman ? curator?.level : null,
					),
				);
			}
			go(next);
		} catch (error) {
			if (isSlotTaken(error)) {
				setSlot(null);
				message.warning(
					t(
						"checkpoints.firstCall.taken",
						"That time was just taken. Pick another one.",
					),
				);
				return;
			}
			message.error(t("checkpoints.goal.saveFailed", "Could not save"));
		}
	};

	const option = (
		value: CheckpointCuratorKind,
		icon: Icon,
		name: string,
		description: string,
		soon = false,
	) => (
		// ui-guard-ignore frame 04 type card: a whole-card choice with a tile, two lines and a radio
		<button
			type="button"
			className={styles.option}
			data-chosen={chosen === value || undefined}
			onClick={() => setKind(value)}
		>
			<IconTile
				icon={icon}
				size="lg"
				tint={
					chosen === value ? "var(--gd-color-surface)" : "var(--gd-fill-subtle)"
				}
				ink="var(--gd-color-text)"
			/>
			<span className={styles.optionText}>
				<Flex gap={8} align="center" wrap>
					<Typography.Text className={styles.optionName}>
						{name}
					</Typography.Text>
					{soon && (
						<Tag className={styles.soon}>
							{t("checkpoints.curator.soon", "Coming soon")}
						</Tag>
					)}
				</Flex>
				<Typography.Text className={styles.optionDescription}>
					{description}
				</Typography.Text>
			</span>
			<Radio checked={chosen === value} />
		</button>
	);

	return (
		<PurchaseLayout
			title={t(
				"checkpoints.curator.title",
				"Who will take this journey with you?",
			)}
			hint={t(
				"checkout.curator.hint",
				"An expert on calls, or the AI curator in writing.",
			)}
			onBack={() => goTo("goal")}
			onStart={exit}
			forward={
				<Button
					type="primary"
					loading={update.isPending}
					// A human curator is only chosen once somebody is actually picked.
					// "Nothing chosen at all" cannot be blocked here: a draft is created
					// with `curatorKind: AI`, so it is indistinguishable from the author
					// having picked the AI curator until the schema records the choice.
					disabled={waitlisted || (isHuman && (!chosenPerson || !firstCall))}
					onClick={() => goTo("payment")}
				>
					{t("checkpoints.curator.next", "Next — payment")}
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
							CheckpointCuratorKind.AI,
							IconSparkles,
							t("checkpoints.curator.ai", "AI curator"),
							t(
								"checkpoints.curator.aiWritten",
								"Written feedback every sprint, a final verdict, clear deadlines and reminders.",
							),
						)}
						{option(
							CheckpointCuratorKind.Human,
							IconUser,
							t("checkpoints.curator.expert", "Industry expert"),
							EXPERT_CHECKPOINT_OPEN
								? t(
										"checkpoints.curator.expertCalls",
										"A call every sprint, a final verdict, clear deadlines and reminders.",
									)
								: t(
										"checkpoints.curator.expertSoon",
										"Calls with an expert every sprint and a final verdict. Opens later.",
									),
							!EXPERT_CHECKPOINT_OPEN,
						)}
					</Flex>
				</div>

				{waitlisted ? (
					<ExpertWaitlist
						joined={waitlist.isError ? false : waitlist.data?.joined}
						joining={join.isPending}
						onJoin={() =>
							join.mutate(undefined, {
								onError: () =>
									message.error(
										t(
											"checkpoints.waitlist.failed",
											"Could not join. Try again.",
										),
									),
							})
						}
						onChooseAI={() => setKind(CheckpointCuratorKind.AI)}
					/>
				) : chosen === CheckpointCuratorKind.Human ? (
					<Flex vertical gap={12}>
						<div>
							<Typography.Text className={styles.label}>
								{t("checkpoints.curator.expertsLabel", "Industry experts")}
							</Typography.Text>

							<CuratorTable
								stage={draft.stageName}
								value={chosenPerson}
								onChange={(userId) => {
									setPerson(userId);
									if (userId !== chosenPerson) setSlot(null);
								}}
							/>
						</div>
						{curator && (
							<FirstCallPicker
								key={curator.userId}
								curatorId={curator.userId}
								curatorName={curator.name.split(" ")[0]}
								earliest={curator.firstCallFrom}
								value={firstCall}
								onChange={setSlot}
							/>
						)}
					</Flex>
				) : (
					<Flex vertical gap={12}>
						{/* Frame 04.1 (`nhoB1`): day 1, when the reviews come, what it costs. */}
						<div className={styles.summary}>
							<SummaryRow
								label={t("checkpoints.curator.dayOne", "Day 1")}
								hint={t(
									"checkpoints.curator.dayOneHint",
									"from the beginning of the day · ends around {date}",
									{
										date: dayjs
											.utc(
												dueDateFrom(
													dayjs.utc(startDay.format("YYYY-MM-DD")).toDate(),
												),
											)
											.format("D MMM"),
									},
								)}
							>
								<DatePicker
									value={startDay}
									format="ddd D MMM YYYY"
									allowClear={false}
									prefix={<IconCalendar size={16} />}
									suffixIcon={null}
									disabledDate={(date) => date.isBefore(dayjs(), "day")}
									onChange={(date) => date && setAiDay(date)}
								/>
							</SummaryRow>
							<SummaryRow
								label={t("checkpoints.curator.reviews", "Reviews")}
								hint={t(
									"checkpoints.curator.reviewsHint",
									"the verdict comes with the last",
								)}
							>
								<Flex gap={8} wrap>
									{reviewDays.map((date) => (
										<Tag key={date.toISOString()}>{date.format("D MMM")}</Tag>
									))}
								</Flex>
							</SummaryRow>
							<SummaryRow
								label={t("checkpoints.curator.price", "Price")}
								hint={t(
									"checkpoints.curator.priceHint",
									"once, for the 28 days · + VAT",
								)}
							>
								<Typography.Text className={styles.fixedAmount}>
									{t("checkpoints.curator.amount", "{currency}{price}", {
										currency: CHECKPOINT_PRICE_CURRENCY,
										price: CHECKPOINT_AI_PRICE,
									})}
								</Typography.Text>
							</SummaryRow>
						</div>

						<Typography.Text type="secondary" className={styles.note}>
							{t(
								"checkpoints.curator.aiLimit",
								"The AI curator reads links, screenshots and what you write. It does not run your build and it holds no calls — judging how a game feels to play is what a person is paid for.",
							)}
						</Typography.Text>
					</Flex>
				)}
			</Flex>
		</PurchaseLayout>
	);
}
