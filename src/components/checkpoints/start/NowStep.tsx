"use client";

import {
	IconAlertTriangle,
	IconDeviceGamepad2,
	IconFlag,
	IconInfoCircle,
	IconSparkles,
} from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import {
	App,
	Avatar,
	Button,
	DatePicker,
	Flex,
	Input,
	InputNumber,
	Modal,
	Popover,
	Skeleton,
	Tag,
	Typography,
} from "antd";
import axios from "axios";
import dayjs, { type Dayjs } from "dayjs";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { VerdictChip } from "@/components/checkpoints/VerdictChip";
import { EmptyState, IconTile } from "@/components/ui";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { CheckpointResult } from "@/components/WorkflowPath/ClosedCheckpoint";
import { CheckpointStatus } from "@/config/prisma-enums";
import {
	useCheckGoal,
	useCheckpoints,
	useUpdateCheckpoint,
} from "@/hooks/checkpoints";
import { teamCapacity } from "@/lib/checkpoint-capacity";
import { dueDateFrom } from "@/lib/checkpoint-days";
import { CHECKPOINT_DAYS, CHECKPOINT_GOAL_MAX } from "@/schemas/checkpoint";
import type { GoalCheckResult } from "@/services/checkpoint-curator/types";
import styles from "./NowStep.module.scss";
import { usePrepareNav } from "./PrepareNav";
import { StartLayout } from "./StartLayout";
import { TeamResource } from "./TeamResource";
import { type TeamHoursRow, useTeamHours } from "./teamHours";
import { useCheckpointDraft } from "./useDraft";

const DAY_FORMAT = "D MMM YYYY";

const span = (hours: { from: number; to: number }) =>
	hours.from === hours.to ? `${hours.from}` : `${hours.from}–${hours.to}`;

/**
 * Frames 03 and 03.2: what the team has, when it starts and what the 28 days
 * are for. No tasks here — they are agreed with the curator on the first call.
 *
 * Next asks the curator whether the goal fits the hours. A warning does not
 * stop anyone: the button turns into "Continue anyway" until the goal changes.
 */
export function NowStep() {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const { go, exit } = usePrepareNav();
	const { draft, project, loading } = useCheckpointDraft();
	const { data: list } = useCheckpoints(project?.id, 1, 50);
	const { data: session } = useSession();
	const queryClient = useQueryClient();
	const team = useTeamHours(project?.team?.id);
	const update = useUpdateCheckpoint(draft?.id);
	const check = useCheckGoal(draft?.id);

	const [goal, setGoal] = useState<string>();
	const [picked, setPicked] = useState<Dayjs | null>(null);
	const [mine, setMine] = useState<[number, number]>();
	// The goal the curator warned about: unchanged, Next goes on regardless.
	const [warned, setWarned] = useState<{
		goal: string;
		remark: GoalCheckResult;
	} | null>(null);
	const [resultsOpen, setResultsOpen] = useState(false);

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
						{t("checkpoints.prepare.toWorkflow", "Back to the workflow")}
					</Button>
				}
			/>
		);
	}

	const text = goal ?? draft.goal;
	const chosen =
		picked ?? (draft.startedAt ? dayjs.utc(draft.startedAt) : dayjs());
	const day = chosen.format("YYYY-MM-DD");
	const finish = dayjs.utc(dueDateFrom(dayjs.utc(day).toDate()));

	const me = team.members.find((row) => row.userId === session?.user?.id);
	const myHours = mine ?? (me ? team.statedFor(me) : null) ?? [0, 0];
	const hoursOf = (row: TeamHoursRow) =>
		row.userId === session?.user?.id ? myHours : team.statedFor(row);
	const capacity = teamCapacity(
		team.members.map((row) => ({ timeForWork: hoursOf(row) })),
	);
	const names = new Intl.ListFormat("en", { type: "conjunction" }).format(
		team.members.map((row) => row.user.name?.split(" ")[0] ?? "—"),
	);

	const previous = (list?.closed.rows ?? [])
		.filter((row) => row.status === CheckpointStatus.Closed && row.verdict)
		.sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""))[0];
	const isFirst = !previous;

	const remark = warned?.goal === text.trim() ? warned.remark : null;

	const next = async () => {
		try {
			await update.mutateAsync({ goal: text.trim(), startedAt: day });
		} catch {
			message.error(t("checkpoints.goal.saveFailed", "Could not save"));
			return;
		}

		if (remark) return go("curator");

		// Advice, never a gate: a check that does not come back lets them through.
		const result = await check.mutateAsync().catch(() => null);
		if (result && !result.reachable) {
			setWarned({ goal: text.trim(), remark: result });
			return;
		}
		go("curator");
	};

	const setShare = (index: 0 | 1, value: number | null) => {
		const hours: [number, number] = [...myHours];
		hours[index] = value ?? 0;
		setMine(hours);
	};

	return (
		<StartLayout
			step="now"
			title={
				isFirst
					? t("checkpoints.now.title", "Glad you're heading for a checkpoint")
					: t(
							"checkpoints.now.titleNext",
							"Glad you're heading for the next checkpoint",
						)
			}
			hint={t(
				"checkpoints.now.hint",
				"{days} days, one goal, and a curator beside you. Let's set it up.",
				{ days: CHECKPOINT_DAYS },
			)}
			forward={
				<Button
					type="primary"
					loading={update.isPending || check.isPending}
					disabled={!text.trim() || myHours[1] <= 0}
					onClick={next}
				>
					{remark
						? t("checkpoints.now.continueAnyway", "Continue anyway")
						: t("checkpoints.now.next", "Next — curator")}
				</Button>
			}
		>
			<Flex gap={16} align="center" className={styles.project}>
				<IconTile icon={IconDeviceGamepad2} size="md" />
				<Flex vertical gap={4}>
					<Typography.Text className={styles.projectName}>
						{project?.name}
					</Typography.Text>
					<Typography.Text type="secondary" className={styles.small}>
						{isFirst
							? t("checkpoints.now.stage", "{stage} stage", {
									stage: draft.stageName,
								})
							: t(
									"checkpoints.now.stageNumber",
									"{stage} stage · checkpoint {number}",
									{ stage: draft.stageName, number: draft.order },
								)}
					</Typography.Text>
				</Flex>
			</Flex>

			<Flex vertical gap={12}>
				<Flex gap={8} align="center">
					<Typography.Text className={styles.heading}>
						{capacity.hoursPerWeek
							? t(
									"checkpoints.now.team",
									"Your team of {count} gives {hours} hours a sprint",
									{
										count: team.members.length,
										hours: span(capacity.hoursPerWeek),
									},
								)
							: t(
									"checkpoints.now.teamUnknown",
									"Your team of {count} has not stated its hours yet",
									{ count: team.members.length },
								)}
					</Typography.Text>
					<Popover
						trigger="hover"
						placement="bottomLeft"
						title={t("checkpoints.now.hoursFrom", "Where the hours come from")}
						content={
							<div className={styles.popover}>
								<TeamResource teamId={project?.team?.id} hoursOf={hoursOf} />
							</div>
						}
					>
						<IconInfoCircle size={16} className={styles.info} />
					</Popover>
				</Flex>
				<Flex gap={12} align="center">
					<Avatar.Group>
						{team.members.map((row) => (
							<AppAvatar key={row.id} src={row.user.image} size={32}>
								{row.user.name?.slice(0, 2).toUpperCase()}
							</AppAvatar>
						))}
					</Avatar.Group>
					<Typography.Text type="secondary">{names}</Typography.Text>
				</Flex>
				{capacity.hoursPerRun && (
					<Typography.Text type="secondary">
						{t(
							"checkpoints.now.run",
							"{hours} hours over the whole checkpoint",
							{ hours: span(capacity.hoursPerRun) },
						)}
					</Typography.Text>
				)}
				<Flex gap={12} align="center" className={styles.share}>
					<Typography.Text>
						{t("checkpoints.now.share", "Your share a sprint")}
					</Typography.Text>
					<Flex gap={8} align="center">
						<InputNumber
							min={0}
							max={80}
							value={myHours[0]}
							className={styles.hours}
							onChange={(value) => setShare(0, value)}
							onBlur={() => saveHours.mutate(myHours)}
						/>
						<Typography.Text type="secondary">–</Typography.Text>
						<InputNumber
							min={0}
							max={80}
							value={myHours[1]}
							className={styles.hours}
							onChange={(value) => setShare(1, value)}
							onBlur={() => saveHours.mutate(myHours)}
						/>
					</Flex>
					<Typography.Text type="secondary">
						{t("checkpoints.now.hours", "hours")}
					</Typography.Text>
				</Flex>
			</Flex>

			{previous && (
				<Flex gap={16} align="center" className={styles.previous}>
					<IconTile icon={IconFlag} size="md" />
					<Flex vertical gap={4} className={styles.grow}>
						<Flex gap={12} align="center">
							<Typography.Text strong>
								{t("checkpoints.number", "Checkpoint {number}", {
									number: previous.order,
								})}
							</Typography.Text>
							{previous.verdict && <VerdictChip verdict={previous.verdict} />}
						</Flex>
						{previous.verdictNote && (
							<Typography.Text type="secondary" className={styles.small}>
								{previous.curator?.name
									? `“${previous.verdictNote}” — ${previous.curator.name}`
									: `“${previous.verdictNote}”`}
							</Typography.Text>
						)}
					</Flex>
					<Button type="text" onClick={() => setResultsOpen(true)}>
						{t("checkpoints.now.viewResults", "View results")}
					</Button>
					<Modal
						open={resultsOpen}
						onCancel={() => setResultsOpen(false)}
						footer={null}
						title={t(
							"workflow.path.results.title",
							"Checkpoint {number} results",
							{
								number: String(previous.order),
							},
						)}
					>
						<Flex vertical gap={16}>
							<CheckpointResult checkpoint={previous} />
						</Flex>
					</Modal>
				</Flex>
			)}

			<Flex vertical gap={8}>
				<Typography.Text className={styles.label}>
					{t("checkpoints.now.when", "When would you like to start?")}
				</Typography.Text>
				<Flex gap={16} align="center">
					<DatePicker
						value={chosen}
						format={DAY_FORMAT}
						allowClear={false}
						className={styles.date}
						disabledDate={(date) => date.isBefore(dayjs(), "day")}
						onChange={setPicked}
					/>
					<Typography.Text type="secondary">
						{t("checkpoints.now.ends", "Ends around {date}", {
							date: finish.format(DAY_FORMAT),
						})}
					</Typography.Text>
				</Flex>
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
					autoSize={{ minRows: 4 }}
					placeholder={t(
						"checkpoints.now.goalPlaceholder",
						"A playable greybox friends can try in 10 minutes…",
					)}
					onChange={(event) => setGoal(event.target.value)}
				/>
			</Flex>

			{remark && (
				<Flex gap={16} align="flex-start" className={styles.warning}>
					<span className={styles.warningIcon}>
						<IconAlertTriangle size={20} />
					</span>
					<Flex vertical gap={4}>
						<Flex gap={8} align="center" wrap>
							<Typography.Text strong>
								{t(
									"checkpoints.now.riskTitle",
									"This goal may not fit the time you have",
								)}
							</Typography.Text>
							<Tag icon={<IconSparkles size={12} />} className={styles.tag}>
								{t("checkpoints.pay.aiSuggestion", "AI suggestion")}
							</Tag>
						</Flex>
						<Typography.Text type="secondary">{remark.note}</Typography.Text>
					</Flex>
				</Flex>
			)}
		</StartLayout>
	);
}
