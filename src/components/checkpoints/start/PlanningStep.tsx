"use client";

import { IconCalendar, IconFlag } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import {
	App,
	Button,
	DatePicker,
	Flex,
	Input,
	Skeleton,
	Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { EmptyState } from "@/components/ui";
import { useUpdateCheckpoint } from "@/hooks/checkpoints";
import { dueDateFrom } from "@/lib/checkpoint-days";
import styles from "./PlanningStep.module.scss";
import { usePrepareNav } from "./PrepareNav";
import { StartLayout } from "./StartLayout";
import { TeamResource } from "./TeamResource";
import { useTeamHours } from "./teamHours";
import { useCheckpointDraft } from "./useDraft";

/** Both ends of the run are days, so they are written the way a day is read. */
const DAY_FORMAT = "D MMM YYYY";

/**
 * Planning: the day the author would like the 28 days to start, and what the
 * team has to spend on them. The day is a wish rather than a promise — a human
 * curator has to accept the checkpoint before it runs.
 *
 * One date decides the whole run, so the finish is shown beside it rather than
 * left for the author to count out — and both are UTC days, because the server
 * counts from UTC midnight and a local one would start the checkpoint a day
 * early east of it.
 */
export function PlanningStep() {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const { go, exit } = usePrepareNav();
	const { draft, project, loading } = useCheckpointDraft();
	const update = useUpdateCheckpoint(draft?.id);

	const [picked, setPicked] = useState<Dayjs | null>(null);
	const [mine, setMine] = useState<number[]>();
	const { data: session } = useSession();
	const { members, statedFor } = useTeamHours(project?.team?.id);

	if (loading) return <Skeleton active paragraph={{ rows: 5 }} />;

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
						{t("checkpoints.prepare.toList", "Back to checkpoints")}
					</Button>
				}
			/>
		);
	}

	const chosen =
		picked ?? (draft.startedAt ? dayjs.utc(draft.startedAt) : dayjs());
	const day = chosen.format("YYYY-MM-DD");
	const start = dayjs.utc(day).toDate();
	const finish = dayjs.utc(dueDateFrom(start));

	// The author is the one person whose hours the purchase cannot do without: a
	// cycle nobody has time for is the thing the checkpoint is meant to prevent.
	const author = members.find((row) => row.userId === session?.user?.id);
	const authorHours = mine ?? (author ? statedFor(author) : null);
	const hasAuthorHours = !!authorHours && authorHours[1] > 0;

	const save = async () => {
		try {
			await update.mutateAsync({ startedAt: day });
			go("payment");
		} catch {
			message.error(t("checkpoints.goal.saveFailed", "Could not save"));
		}
	};

	return (
		<StartLayout
			step="planning"
			hint={t(
				"checkpoints.when.hint",
				"Say when you would like the 28 days to begin and confirm how much time the team has for them.",
			)}
			onBack={() => go("curator")}
			forward={
				<Button
					type="primary"
					loading={update.isPending}
					disabled={!hasAuthorHours}
					onClick={save}
				>
					{t("checkpoints.when.next", "Next — payment")}
				</Button>
			}
		>
			<Flex vertical gap={24}>
				<Flex gap={16}>
					<div className={styles.field}>
						<Typography.Text className={styles.label}>
							{t("checkpoints.when.startDate", "Preferred start date")}
						</Typography.Text>
						<DatePicker
							variant="filled"
							value={chosen}
							format={DAY_FORMAT}
							allowClear={false}
							className={styles.control}
							disabledDate={(date) => date.isBefore(dayjs(), "day")}
							onChange={setPicked}
						/>
					</div>

					<div className={styles.field}>
						<Typography.Text className={styles.label}>
							{t("checkpoints.when.finishDate", "Finish date")}
						</Typography.Text>
						<Input
							readOnly
							variant="filled"
							className={`${styles.control} ${styles.readonly}`}
							value={finish.format(DAY_FORMAT)}
							suffix={
								<IconCalendar
									size={16}
									stroke={1.6}
									className={styles.suffixIcon}
								/>
							}
						/>
						<Typography.Text type="secondary" className={styles.fieldNote}>
							{t("checkpoints.when.finishAuto", "Calculated automatically")}
						</Typography.Text>
					</div>
				</Flex>

				<div>
					<Typography.Text className={styles.label}>
						{t("checkpoints.when.capacity", "Team capacity")}
					</Typography.Text>
					<TeamResource
						teamId={project?.team?.id}
						mine={mine}
						onMine={setMine}
					/>
				</div>
			</Flex>
		</StartLayout>
	);
}
