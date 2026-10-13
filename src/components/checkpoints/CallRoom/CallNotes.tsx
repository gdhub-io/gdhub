"use client";

import {
	IconArrowRight,
	IconCircleDashed,
	IconHelpCircle,
	IconHourglass,
	IconListCheck,
	IconLock,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Segmented, Skeleton, Tabs, Tag, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import { type ReactNode, useState } from "react";
import { EmptyState, SectionHeading } from "@/components/ui";
import { formatShort } from "@/components/WorkflowPath/dates";
import { CheckpointSessionContentStatus } from "@/config/prisma-enums";
import { useCallNotes } from "@/hooks/checkpoint-call";
import { dateOfDay } from "@/lib/checkpoint-plan";
import type {
	CallNotesDto,
	CheckpointCallDto,
} from "@/repositories/checkpoint-call";
import type { CallNotes as CallNotesContent } from "@/types/checkpoints";
import styles from "./style.module.scss";

type Session = CheckpointCallDto["sessions"][number];
type Plan = CheckpointCallDto["plan"];

const latestHeld = (sessions: Session[]) =>
	sessions.filter((session) => session.held).at(-1)?.index ?? null;

/** The notes of the checkpoint's held calls, the latest one first. */
export function CallNotes({ call }: { call: CheckpointCallDto }) {
	const [picked, setPicked] = useState<number | null>(null);
	const selected = picked ?? latestHeld(call.sessions);
	const notes = useCallNotes(call.checkpointId, selected);

	return (
		<NotesBlock
			sessions={call.sessions}
			plan={call.plan}
			selected={selected}
			onSelect={setPicked}
			notes={notes.data}
			loading={notes.isPending}
		/>
	);
}

export type NotesBlockProps = {
	sessions: Session[];
	plan: Plan;
	/** Null while no call has been held. */
	selected: number | null;
	onSelect: (index: number) => void;
	notes?: CallNotesDto;
	loading: boolean;
};

/** Frames 08.4 (on its way) and 08.5 (ready). */
export function NotesBlock({
	sessions,
	plan,
	selected,
	onSelect,
	notes,
	loading,
}: NotesBlockProps) {
	const { t } = useTranslate();

	const switcher = (
		<div className={styles.switcher}>
			<Segmented<number>
				value={selected ?? undefined}
				onChange={onSelect}
				options={sessions.map((session) => {
					const label = t(
						"checkpoints.call.notes.option",
						"Call {index} · {date}",
						{
							index: session.index,
							date: dayjs(session.scheduledAt).format("D MMM"),
						},
					);
					return {
						value: session.index,
						disabled: !session.held,
						label: session.held ? (
							label
						) : (
							<Tooltip
								title={t(
									"checkpoints.call.notes.lockedCall",
									"Notes appear after this call",
								)}
							>
								<span className={styles.lockedOption}>
									<IconLock size={14} />
									{label}
								</span>
							</Tooltip>
						),
					};
				})}
			/>
		</div>
	);

	const skeleton = <Skeleton active paragraph={{ rows: 6 }} />;

	let summary: ReactNode;
	let transcript: ReactNode;
	if (loading) {
		summary = skeleton;
		transcript = skeleton;
	} else {
		summary =
			notes?.contentStatus === CheckpointSessionContentStatus.Ready &&
			notes.content ? (
				<NotesSummary
					content={notes.content}
					plan={plan}
					startedAt={
						sessions.find((session) => session.index === 1)?.scheduledAt
					}
				/>
			) : (
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
		transcript = notes?.transcript ? (
			<Typography.Paragraph className={styles.transcript}>
				{notes.transcript}
			</Typography.Paragraph>
		) : (
			<Typography.Text type="secondary">
				{t("checkpoints.call.notes.noTranscript", "No transcript yet.")}
			</Typography.Text>
		);
	}

	return (
		<section className={styles.panel}>
			<SectionHeading
				level={4}
				title={t("checkpoints.call.notes.title", "Call notes")}
				action={switcher}
				className={styles.notesHead}
			/>
			{selected === null ? (
				<Typography.Text type="secondary">
					{t(
						"checkpoints.call.notes.noneHeld",
						"Notes appear after the first call.",
					)}
				</Typography.Text>
			) : (
				<Tabs
					items={[
						{
							key: "summary",
							label: t("checkpoints.call.notes.summary", "Summary"),
							children: summary,
						},
						{
							key: "transcript",
							label: t("checkpoints.call.notes.transcript", "Transcript"),
							children: transcript,
						},
					]}
				/>
			)}
		</section>
	);
}

/** 08.5: the summary, its task references read back from the plan. */
function NotesSummary({
	content,
	plan,
	startedAt,
}: {
	content: CallNotesContent;
	plan: Plan;
	/** Session 1's date: day 1 of the checkpoint, for the due dates. */
	startedAt?: string;
}) {
	const { t } = useTranslate();
	const taskText = (itemId: string | null) =>
		plan.tasks.find((task) => task.id === itemId)?.text;
	const notDiscussed = content.notDiscussed.flatMap((itemId) => {
		const text = taskText(itemId);
		return text ? [{ itemId, text }] : [];
	});

	const agreedMeta = (item: CallNotesContent["agreed"][number]) => {
		const target = item.itemId
			? taskText(item.itemId)
			: t("checkpoints.call.notes.outsidePlan", "Outside the plan");
		const due =
			item.dueDay && startedAt
				? t("checkpoints.call.notes.due", "due {date}", {
						date: formatShort(dateOfDay(startedAt, item.dueDay).toISOString()),
					})
				: undefined;
		return [target, due].filter(Boolean).join(" · ");
	};

	return (
		<div className={styles.notes}>
			{content.inShort && (
				<div className={styles.inShort}>
					<Typography.Text type="secondary" className={styles.notesLabel}>
						{t("checkpoints.call.notes.inShort", "In short")}
					</Typography.Text>
					<Typography.Text className={styles.inShortText}>
						{content.inShort}
					</Typography.Text>
				</div>
			)}

			{(content.discussed.length > 0 || notDiscussed.length > 0) && (
				<div>
					<div className={styles.notesSectionHead}>
						<Typography.Text type="secondary" className={styles.notesLabel}>
							{t("checkpoints.call.notes.discussed", "What was discussed")}
						</Typography.Text>
						{plan.goal && (
							<Typography.Text
								type="secondary"
								className={styles.small}
								ellipsis={{ tooltip: plan.goal }}
							>
								{t("checkpoints.call.notes.goal", "Goal: {goal}", {
									goal: plan.goal,
								})}
							</Typography.Text>
						)}
					</div>
					{content.discussed.map((item, index) => {
						const task = taskText(item.itemId);
						return (
							<div key={`${item.itemId}-${index}`} className={styles.discussed}>
								{task && (
									<Tag
										icon={<IconListCheck size={14} />}
										className={styles.taskTag}
									>
										{task}
									</Tag>
								)}
								<Typography.Text>{item.text}</Typography.Text>
							</div>
						);
					})}
					{notDiscussed.map((item) => (
						<div key={item.itemId} className={styles.notDiscussed}>
							<IconCircleDashed size={16} />
							<Typography.Text type="secondary">
								{t(
									"checkpoints.call.notes.notDiscussed",
									"Not discussed: {task}",
									{
										task: item.text,
									},
								)}
							</Typography.Text>
						</div>
					))}
				</div>
			)}

			{content.outsidePlan.length > 0 && (
				<div className={styles.notesGroup}>
					<Typography.Text type="secondary" className={styles.notesLabel}>
						{t("checkpoints.call.notes.outsidePlan", "Outside the plan")}
					</Typography.Text>
					{content.outsidePlan.map((text, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: generated paragraphs have no id and never reorder
						<Typography.Text key={index}>{text}</Typography.Text>
					))}
				</div>
			)}

			{(content.agreed.length > 0 || content.questions.length > 0) && (
				<div className={styles.notesColumns}>
					<div className={styles.notesGroup}>
						<Typography.Text type="secondary" className={styles.notesLabel}>
							{t("checkpoints.call.notes.agreed", "Agreed for the next call")}
						</Typography.Text>
						{content.agreed.map((item, index) => {
							const meta = agreedMeta(item);
							return (
								// biome-ignore lint/suspicious/noArrayIndexKey: generated lines have no id and never reorder
								<div key={index} className={styles.agreed}>
									<Typography.Text>{item.text}</Typography.Text>
									{meta && (
										<Typography.Text
											type="secondary"
											className={styles.agreedMeta}
										>
											<IconArrowRight size={14} />
											{meta}
										</Typography.Text>
									)}
								</div>
							);
						})}
					</div>
					<div className={styles.notesGroup}>
						<Typography.Text type="secondary" className={styles.notesLabel}>
							{t("checkpoints.call.notes.questions", "Open questions")}
						</Typography.Text>
						{content.questions.map((question, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: generated lines have no id and never reorder
							<div key={index} className={styles.question}>
								<IconHelpCircle size={16} className={styles.questionIcon} />
								<Typography.Text>{question}</Typography.Text>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
