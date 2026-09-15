"use client";

import { IconFlag } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	App,
	Button,
	DatePicker,
	Flex,
	Segmented,
	Skeleton,
	Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useState } from "react";
import { EmptyState } from "@/components/ui";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import { useUpdateCheckpoint } from "@/hooks/checkpoints";
import { dueDateFrom } from "@/lib/checkpoint-days";
import { devlogDayOf, sprintRange } from "@/lib/checkpoint-sprints";
import styles from "./PlanningStep.module.scss";
import { usePrepareNav } from "./PrepareNav";
import { StartLayout } from "./StartLayout";
import { TeamResource } from "./TeamResource";
import { useCheckpointDraft } from "./useDraft";

/**
 * Planning: the day the 28 days start, and what the team has to spend on them.
 *
 * One date decides four sprints, four devlogs and a verdict, so the answer is
 * shown back as the calendar it produces rather than left as a field. With a
 * human curator the day is a request: they confirm it when they take the
 * checkpoint, and everything below moves with it.
 */
export function PlanningStep() {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const { go, exit } = usePrepareNav();
	const { draft, project, loading } = useCheckpointDraft();
	const update = useUpdateCheckpoint(draft?.id);

	const [picked, setPicked] = useState<Dayjs | null>(null);
	const [mode, setMode] = useState<"soon" | "day">("soon");

	if (loading) return <Skeleton active paragraph={{ rows: 5 }} />;

	if (!draft) {
		return (
			<EmptyState
				icon={IconFlag}
				title={t("checkpoints.start.noDraft", "There is no draft to continue")}
				action={
					<Button type="primary" onClick={exit}>
						{t("checkpoints.start.toList", "Back to checkpoints")}
					</Button>
				}
			/>
		);
	}

	const isAI = draft.curatorKind === CheckpointCuratorKind.AI;
	const chosen =
		picked ?? (draft.startedAt ? dayjs.utc(draft.startedAt) : dayjs());
	// The day is a day, not an instant: the server counts the 28 days from UTC
	// midnight, so a local midnight would start the checkpoint a day early east
	// of it and this preview would contradict the sidebar it produces.
	const day = chosen.format("YYYY-MM-DD");
	const start = dayjs.utc(day).toDate();
	const devlogs = [1, 2, 3, 4].map((sprint) =>
		dayjs.utc(start).add(devlogDayOf(sprint) - 1, "day"),
	);

	const save = async () => {
		try {
			await update.mutateAsync({ startedAt: mode === "day" ? day : null });
			go("payment");
		} catch {
			message.error(t("checkpoints.goal.saveFailed", "Could not save"));
		}
	};

	return (
		<StartLayout
			step="planning"
			question={t("checkpoints.prepare.q4", "When do you want to start?")}
			hint={t(
				"checkpoints.when.hint",
				"One day decides the whole calendar — the sprints, the devlogs and the verdict.",
			)}
			onBack={() => go("curator")}
			onCancel={exit}
			forward={
				<Button type="primary" loading={update.isPending} onClick={save}>
					{t("checkpoints.when.next", "To the payment")}
				</Button>
			}
		>
			<Flex vertical gap={20}>
				<Segmented
					value={mode}
					onChange={(value) => setMode(value as typeof mode)}
					options={[
						{
							value: "soon",
							label: isAI
								? t("checkpoints.when.asapAi", "As soon as it is paid")
								: t("checkpoints.when.asap", "As soon as the curator takes it"),
						},
						{
							value: "day",
							label: t("checkpoints.when.pick", "On a day I choose"),
						},
					]}
				/>

				{mode === "day" && (
					<Flex vertical gap={6}>
						<Typography.Text>
							{t("checkpoints.when.startsOn", "Starts on")}
						</Typography.Text>
						<DatePicker
							variant="filled"
							value={chosen}
							onChange={setPicked}
							allowClear={false}
							className={styles.picker}
							disabledDate={(date) => date.isBefore(dayjs(), "day")}
						/>
					</Flex>
				)}

				<div className={styles.calendar}>
					<Typography.Text className={styles.calendarTitle}>
						{t("checkpoints.when.runs", "Runs {from} – {to}", {
							from: dayjs.utc(start).format("D MMM"),
							to: dayjs.utc(dueDateFrom(start)).format("D MMM YYYY"),
						})}
					</Typography.Text>
					<Typography.Text type="secondary" className={styles.calendarBody}>
						{t(
							"checkpoints.when.calendar",
							"Sprint 1 opens on {s1}, then {s2}, {s3} and {s4}. Devlogs fall on {d1}, {d2}, {d3} and {d4}, and the verdict is written by {verdict}.",
							{
								s1: dayjs.utc(sprintRange(start, 1).from).format("D MMM"),
								s2: dayjs.utc(sprintRange(start, 2).from).format("D MMM"),
								s3: dayjs.utc(sprintRange(start, 3).from).format("D MMM"),
								s4: dayjs.utc(sprintRange(start, 4).from).format("D MMM"),
								d1: devlogs[0].format("D MMM"),
								d2: devlogs[1].format("D MMM"),
								d3: devlogs[2].format("D MMM"),
								d4: devlogs[3].format("D MMM"),
								verdict: dayjs
									.utc(dueDateFrom(start))
									.add(2, "day")
									.format("D MMM"),
							},
						)}
					</Typography.Text>
				</div>

				<TeamResource teamId={project?.team?.id} />

				{!isAI && (
					<Typography.Text type="secondary" className={styles.note}>
						{t(
							"checkpoints.when.curatorConfirms",
							"The curator confirms the day when they take the checkpoint. If they move it, every date above moves with it and you are told.",
						)}
					</Typography.Text>
				)}
			</Flex>
		</StartLayout>
	);
}
