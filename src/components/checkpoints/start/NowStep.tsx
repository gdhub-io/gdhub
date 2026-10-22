"use client";

import {
	IconAlertTriangle,
	IconFlag,
	IconInfoCircle,
	IconSparkles,
	IconUsers,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	App,
	Button,
	Flex,
	Input,
	InputNumber,
	Popover,
	Skeleton,
	Tag,
	Typography,
} from "antd";
import axios from "axios";
import { useSession } from "next-auth/react";
import { type ComponentProps, type ReactNode, useState } from "react";
import { EmptyState, IconTile } from "@/components/ui";
import {
	CHECKPOINT_DAYS,
	CHECKPOINT_GOAL_MAX,
	CHECKPOINT_LARGE_TEAM_EMAIL,
	CHECKPOINT_MAX_TEAM,
} from "@/config/checkpoint";
import { trackCheckpoint } from "@/helpers/gtm";
import { useRateLimitWarning } from "@/hooks/checkpoint-entry";
import { useCheckGoal, useUpdateCheckpoint } from "@/hooks/checkpoints";
import { teamCapacity } from "@/lib/checkpoint-capacity";
import type { GoalCheckResult } from "@/services/checkpoint-curator/types";
import styles from "./NowStep.module.scss";
import { usePrepareNav } from "./PrepareNav";
import { PurchaseLayout } from "./PurchaseLayout";
import { TeamResource } from "./TeamResource";
import { type TeamHoursRow, useTeamHours } from "./teamHours";
import { useCheckpointDraft } from "./useDraft";

/** One figure for a stated range: what the team gives on an ordinary sprint. */
const middle = (hours: { from: number; to: number }) =>
	Math.round((hours.from + hours.to) / 2);

/**
 * Frames 12.3 (`mfAfN`) and 03.2: the hours the team has and what the 28 days
 * are for. The project is chosen in the hub, before the wizard opens. No tasks
 * here — they are agreed with the curator on the first call.
 *
 * Next asks the curator whether the goal fits the hours. A warning does not
 * stop anyone: the button turns into "Continue anyway" until the goal changes.
 */
export function NowStep() {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const { go, exit } = usePrepareNav();
	const { draft, project, loading } = useCheckpointDraft();
	const { data: session } = useSession();
	const queryClient = useQueryClient();
	const team = useTeamHours(project?.team?.id);
	const update = useUpdateCheckpoint(draft?.id);
	const check = useCheckGoal(draft?.id);
	const rateLimited = useRateLimitWarning();

	const [goal, setGoal] = useState<string>();
	const [mine, setMine] = useState<[number, number]>();
	// The goal the curator warned about: unchanged, Next goes on regardless.
	const [warned, setWarned] = useState<{
		goal: string;
		remark: GoalCheckResult;
	} | null>(null);

	const saveHours = useMutation({
		mutationFn: (timeForWork: number[]) =>
			axios.put("/api/user/profile", { timeForWork }),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: ["user-project-team", project?.team?.id],
			}),
		onError: () =>
			message.error(t("checkpoints.goal.saveFailed", "Could not save")),
	});

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

	const text = goal ?? draft.goal;

	const me = team.members.find((row) => row.userId === session?.user?.id);
	const stated = me ? team.statedFor(me) : null;
	const myHours = mine ?? stated ?? [0, 0];
	// Tabbing through the inputs must not write the profile it just read.
	const saveMine = () => {
		if (mine && (mine[0] !== stated?.[0] || mine[1] !== stated?.[1])) {
			saveHours.mutate(mine);
		}
	};
	const hoursOf = (row: TeamHoursRow) =>
		row.userId === session?.user?.id ? myHours : team.statedFor(row);
	const capacity = teamCapacity(
		team.members.map((row) => ({ timeForWork: hoursOf(row) })),
	);

	const remark = warned?.goal === text.trim() ? warned.remark : null;
	const tooLarge = team.members.length > CHECKPOINT_MAX_TEAM;

	const proceed = (afterWarning: boolean) => {
		trackCheckpoint("checkpoint_goal_set", { warned: afterWarning });
		go("curator");
	};

	const next = async () => {
		try {
			await update.mutateAsync({ goal: text.trim() });
		} catch {
			message.error(t("checkpoints.goal.saveFailed", "Could not save"));
			return;
		}

		if (remark) return proceed(true);

		// Advice, never a gate: a check that does not come back lets them through —
		// except a 429, which asks them to wait rather than skip it.
		let limited = false;
		const result = await check.mutateAsync().catch((error) => {
			limited = rateLimited(error);
			return null;
		});
		if (limited) return;
		if (result && !result.reachable) {
			setWarned({ goal: text.trim(), remark: result });
			return;
		}
		proceed(false);
	};

	const stat = (label: string, value: string) => (
		<Flex vertical gap={8} className={styles.stat}>
			<Typography.Text className={styles.statLabel}>{label}</Typography.Text>
			<Typography.Text className={styles.statValue}>{value}</Typography.Text>
		</Flex>
	);

	const setShare = (index: 0 | 1, value: number | null) => {
		const hours: [number, number] = [...myHours];
		hours[index] = value ?? 0;
		setMine(hours);
	};

	return (
		<PurchaseLayout
			title={t("checkout.goal.title", "Your goal")}
			hint={t(
				"checkout.goal.hint",
				"One goal for the {days} days, and the hours your team can give.",
				{ days: CHECKPOINT_DAYS },
			)}
			// The first question: back is the way out of the purchase.
			onBack={exit}
			forward={
				<Button
					type="primary"
					loading={update.isPending || check.isPending}
					disabled={!text.trim() || myHours[1] <= 0 || tooLarge}
					onClick={next}
				>
					{remark
						? t("checkpoints.now.continueAnyway", "Continue anyway")
						: t("checkpoints.now.next", "Next — curator")}
				</Button>
			}
		>
			<Flex vertical gap={8}>
				<Flex gap={8} align="center">
					<Typography.Text className={styles.label}>
						{t("checkpoints.now.resource", "Work resource")}
					</Typography.Text>
					<Popover
						trigger="click"
						placement="bottomLeft"
						title={t("checkpoints.now.hoursFrom", "Where the hours come from")}
						content={
							<div className={styles.popover}>
								<TeamResource teamId={project?.team?.id} hoursOf={hoursOf} />
							</div>
						}
					>
						<Button
							type="text"
							size="small"
							className={styles.info}
							aria-label={t(
								"checkpoints.now.hoursFrom",
								"Where the hours come from",
							)}
							icon={<IconInfoCircle size={16} />}
						/>
					</Popover>
				</Flex>
				{team.isLoading ? (
					<Skeleton active title={false} paragraph={{ rows: 2 }} />
				) : (
					<div className={styles.resource}>
						<Flex vertical gap={8} className={styles.stat}>
							<Typography.Text className={styles.statLabel}>
								{t("checkpoints.now.yourTime", "You give a sprint")}
							</Typography.Text>
							<Flex gap={8} align="center">
								<InputNumber
									min={0}
									max={80}
									aria-label={t(
										"checkpoints.now.hoursFromLabel",
										"Your hours a sprint, from",
									)}
									value={myHours[0]}
									size="small"
									variant="filled"
									controls={false}
									className={styles.hours}
									onChange={(value) => setShare(0, value)}
									onBlur={saveMine}
								/>
								<Typography.Text type="secondary">–</Typography.Text>
								<InputNumber
									min={0}
									max={80}
									aria-label={t(
										"checkpoints.now.hoursToLabel",
										"Your hours a sprint, up to",
									)}
									value={myHours[1]}
									size="small"
									variant="filled"
									controls={false}
									className={styles.hours}
									onChange={(value) => setShare(1, value)}
									onBlur={saveMine}
								/>
								<Typography.Text type="secondary">
									{t("checkpoints.now.hoursShort", "h")}
								</Typography.Text>
							</Flex>
						</Flex>
						{stat(
							t("checkpoints.now.teamSize", "Team"),
							t(
								"checkpoints.now.people",
								"{count, plural, one {# person} other {# people}}",
								{ count: team.members.length },
							),
						)}
						{stat(
							t("checkpoints.now.perSprint", "A sprint"),
							capacity.hoursPerWeek
								? t("checkpoints.now.hoursAbout", "~{hours} h", {
										hours: middle(capacity.hoursPerWeek),
									})
								: "—",
						)}
						{stat(
							t("checkpoints.now.perCheckpoint", "The checkpoint"),
							capacity.hoursPerRun
								? t("checkpoints.now.hoursAbout", "~{hours} h", {
										hours: middle(capacity.hoursPerRun),
									})
								: "—",
						)}
					</div>
				)}
			</Flex>

			<Flex vertical gap={8} className={styles.goal}>
				<Typography.Text className={styles.label}>
					{t(
						"checkpoints.now.goal",
						"What do you want to have in {days} days?",
						{
							days: CHECKPOINT_DAYS,
						},
					)}
				</Typography.Text>
				<Input.TextArea
					variant="filled"
					value={text}
					maxLength={CHECKPOINT_GOAL_MAX}
					showCount
					autoSize={{ minRows: 3 }}
					placeholder={t(
						"checkpoints.now.goalPlaceholder",
						"A playable greybox friends can try in 10 minutes…",
					)}
					onChange={(event) => setGoal(event.target.value)}
				/>
			</Flex>

			{tooLarge && (
				<Warning icon={IconUsers}>
					<Typography.Text strong>
						{t(
							"checkpoints.now.teamTooLargeTitle",
							"A team over {max} gets its own offer",
							{ max: CHECKPOINT_MAX_TEAM },
						)}
					</Typography.Text>
					<Typography.Text type="secondary">
						{t(
							"checkpoints.now.teamTooLargeBody",
							"One price covers a team of 1 to {max}. Write to {email} and we'll send you an offer.",
							{
								max: CHECKPOINT_MAX_TEAM,
								email: CHECKPOINT_LARGE_TEAM_EMAIL,
							},
						)}
					</Typography.Text>
					<Typography.Link href={`mailto:${CHECKPOINT_LARGE_TEAM_EMAIL}`}>
						{t("checkpoints.now.teamTooLargeAction", "Ask for an offer")}
					</Typography.Link>
				</Warning>
			)}

			{remark && (
				<Warning icon={IconAlertTriangle}>
					<Flex gap={8} align="center" wrap>
						<Typography.Text strong>
							{t(
								"checkpoints.now.riskTitle",
								"This goal may not fit the time you have",
							)}
						</Typography.Text>
						<Tag icon={<IconSparkles size={14} />}>
							{t("checkpoints.pay.aiSuggestion", "AI suggestion")}
						</Tag>
					</Flex>
					<Typography.Text type="secondary">{remark.note}</Typography.Text>
				</Warning>
			)}
		</PurchaseLayout>
	);
}

function Warning({
	icon,
	children,
}: {
	icon: ComponentProps<typeof IconTile>["icon"];
	children: ReactNode;
}) {
	return (
		<Flex gap={16} align="flex-start" className={styles.warning}>
			<IconTile
				icon={icon}
				size="md"
				tint="var(--gd-color-surface)"
				ink="var(--gd-warning-solid)"
			/>
			<Flex vertical gap={4}>
				{children}
			</Flex>
		</Flex>
	);
}
