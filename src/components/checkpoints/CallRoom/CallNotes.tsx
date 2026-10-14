"use client";

import {
	IconCircleDashed,
	IconHelpCircle,
	IconHourglass,
	IconListCheck,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Skeleton, Table, Typography } from "antd";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui";
import { CheckpointSessionContentStatus } from "@/config/prisma-enums";
import type {
	CallNotesDto,
	CheckpointCallDto,
} from "@/repositories/checkpoint-call";
import type { CallNotes as CallNotesContent } from "@/types/checkpoints";
import { TaskIcon } from "./CallPlan";
import styles from "./style.module.scss";

type Plan = CheckpointCallDto["plan"];
type Agreed = CallNotesContent["agreed"][number];

export type NotesBodyProps = {
	/** The call the notes belong to: call 1 opens the checkpoint, the rest close a sprint. */
	index: number;
	/** False until the call is over: there is nothing to fetch yet. */
	held: boolean;
	plan: Plan;
	notes?: CallNotesDto;
	loading: boolean;
};

/** The Notes tab: frames gP5gH (ready) and 08.4 (on its way). */
export function NotesBody({
	index,
	held,
	plan,
	notes,
	loading,
}: NotesBodyProps) {
	const { t } = useTranslate();

	if (!held) {
		return (
			<Typography.Text type="secondary">
				{t("checkpoints.call.notes.lockedCall", "Notes appear after this call")}
			</Typography.Text>
		);
	}
	if (loading) return <Skeleton active paragraph={{ rows: 6 }} />;
	if (
		notes?.contentStatus !== CheckpointSessionContentStatus.Ready ||
		!notes.content
	) {
		return (
			<EmptyState
				icon={IconHourglass}
				title={t(
					"checkpoints.call.notes.pendingTitle",
					"The summary is on its way",
				)}
				description={t(
					"checkpoints.call.notes.pendingText",
					"The transcript and summary of this call are ready within 24 hours. We'll email you when they are.",
				)}
			/>
		);
	}
	return <NotesSummary index={index} content={notes.content} plan={plan} />;
}

/** The transcript tab's body; the tab itself is hidden for now. */
export function NotesTranscript({
	notes,
	loading,
}: {
	notes?: CallNotesDto;
	loading: boolean;
}) {
	const { t } = useTranslate();

	if (loading) return <Skeleton active paragraph={{ rows: 6 }} />;
	return notes?.transcript ? (
		<Typography.Paragraph className={styles.transcript}>
			{notes.transcript}
		</Typography.Paragraph>
	) : (
		<Typography.Text type="secondary">
			{t("checkpoints.call.notes.noTranscript", "No transcript yet.")}
		</Typography.Text>
	);
}

function Group({
	label,
	quiet,
	children,
}: {
	label: string;
	quiet?: boolean;
	children: ReactNode;
}) {
	return (
		<div className={styles.notesGroup}>
			<Typography.Text
				className={`${styles.notesLabel} ${quiet ? styles.tertiary : styles.secondary}`}
			>
				{label}
			</Typography.Text>
			{children}
		</div>
	);
}

/** gP5gH: the summary, its task references read back from the plan. */
function NotesSummary({
	index,
	content,
	plan,
}: {
	index: number;
	content: CallNotesContent;
	plan: Plan;
}) {
	const { t } = useTranslate();
	const taskOf = (itemId: string | null) =>
		plan.tasks.find((task) => task.id === itemId);
	const notDiscussed = content.notDiscussed.flatMap((itemId) => {
		const task = taskOf(itemId);
		return task ? [task] : [];
	});

	return (
		<div className={styles.notes}>
			{content.inShort && (
				<div className={styles.inShort}>
					<Typography.Text type="secondary" className={styles.notesLabel}>
						{index > 1
							? t(
									"checkpoints.call.notes.sprintWent",
									"How Sprint {sprint} went",
									{
										sprint: index - 1,
									},
								)
							: t("checkpoints.call.notes.inShort", "In short")}
					</Typography.Text>
					<Typography.Text className={styles.lead}>
						{content.inShort}
					</Typography.Text>
				</div>
			)}

			{content.discussed.length > 0 && (
				<Group
					label={t("checkpoints.call.notes.discussed", "What was discussed")}
				>
					<div>
						{content.discussed.map((item, position) => {
							const task = taskOf(item.itemId);
							return (
								<div
									key={`${item.itemId}-${position}`}
									className={styles.discussed}
								>
									{task && (
										<div className={styles.discussedHead}>
											<TaskIcon task={task} />
											<Typography.Text
												delete={task.cut}
												type={task.cut ? "secondary" : undefined}
												className={styles.discussedTitle}
											>
												{task.text}
											</Typography.Text>
										</div>
									)}
									<Typography.Text className={styles.retelling}>
										{item.text}
									</Typography.Text>
								</div>
							);
						})}
					</div>
				</Group>
			)}

			{notDiscussed.length > 0 && (
				<Group
					quiet
					label={t(
						"checkpoints.call.notes.notDiscussedTitle",
						"Not discussed on this call",
					)}
				>
					{notDiscussed.map((task) => (
						<div key={task.id} className={styles.notDiscussed}>
							<IconCircleDashed size={16} />
							<Typography.Text type="secondary">{task.text}</Typography.Text>
						</div>
					))}
				</Group>
			)}

			<Group
				label={t("checkpoints.call.notes.outsidePlan", "Outside the plan")}
			>
				{content.outsidePlan.length ? (
					content.outsidePlan.map((text, position) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: generated paragraphs have no id and never reorder
						<Typography.Text key={position}>{text}</Typography.Text>
					))
				) : (
					<Typography.Text className={styles.tertiary}>
						{t(
							"checkpoints.call.notes.nothingOutside",
							"Nothing came up beyond the plan.",
						)}
					</Typography.Text>
				)}
			</Group>

			{content.agreed.length > 0 && (
				<Group
					label={t("checkpoints.call.notes.agreed", "Agreed for the next call")}
				>
					<Table<Agreed & { key: number }>
						showHeader={false}
						pagination={false}
						size="middle"
						className={styles.agreed}
						dataSource={content.agreed.map((item, key) => ({ ...item, key }))}
						columns={[
							{ key: "text", dataIndex: "text" },
							{
								key: "target",
								align: "right",
								render: (_, item) => {
									const task = taskOf(item.itemId);
									if (task) {
										return (
											<span className={styles.agreedTarget}>
												<IconListCheck size={14} />
												{task.text}
											</span>
										);
									}
									return (
										<span className={styles.agreedTarget}>
											<IconCircleDashed size={14} />
											{t(
												"checkpoints.call.notes.outsidePlan",
												"Outside the plan",
											)}
										</span>
									);
								},
							},
						]}
					/>
				</Group>
			)}

			<Group label={t("checkpoints.call.notes.questions", "Open questions")}>
				{content.questions.length ? (
					content.questions.map((question, position) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: generated lines have no id and never reorder
						<div key={position} className={styles.question}>
							<IconHelpCircle size={16} className={styles.questionIcon} />
							<Typography.Text>{question}</Typography.Text>
						</div>
					))
				) : (
					<Typography.Text className={styles.tertiary}>
						{t(
							"checkpoints.call.notes.noQuestions",
							"No open questions were left on the call.",
						)}
					</Typography.Text>
				)}
			</Group>
		</div>
	);
}
