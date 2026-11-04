"use client";

import {
	IconCircleDashed,
	IconCode,
	IconHelpCircle,
	IconHourglass,
	IconListCheck,
	IconSpeakerphone,
	IconUsers,
	type TablerIcon,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Skeleton, Table, Typography } from "antd";
import type { ReactNode } from "react";
import {
	DirectionConfirm,
	SprintDirectionView,
} from "@/components/checkpoints/SprintDirection";
import { EmptyState } from "@/components/ui";
import type { CuratorLens } from "@/config/checkpoint";
import { CheckpointSessionContentStatus } from "@/config/prisma-enums";
import type { CallNotesDto, CheckpointCallDto } from "@/types/checkpoint-call";
import type {
	CallNotes as CallNotesContent,
	ReviewLenses,
} from "@/types/checkpoints";
import { TaskIcon } from "./CallPlan";
import styles from "./style.module.scss";

type Plan = Pick<CheckpointCallDto["plan"], "tasks">;
type Agreed = CallNotesContent["agreed"][number];

export type NotesBodyProps = {
	checkpointId: string;
	stage: string;
	/** The curator confirms the direction; the team reads it once confirmed. */
	curator: boolean;
	/** False once the final call has started: the directions are settled. */
	directionOpen: boolean;
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
	checkpointId,
	stage,
	curator,
	directionOpen,
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
				size="compact"
				icon={IconHourglass}
				title={t(
					"checkpoints.call.notes.pendingReviewTitle",
					"The review is on its way",
				)}
				description={t(
					"checkpoints.call.notes.pendingSoon",
					"The review of this call is written from its recording within two hours. We'll email you when it's ready.",
				)}
			/>
		);
	}
	const { direction } = notes.content;
	return (
		<NotesSummary
			index={index}
			content={notes.content}
			plan={plan}
			curator={curator}
			direction={
				index > 1 &&
				(curator ? (
					<DirectionConfirm
						checkpointId={checkpointId}
						index={index}
						direction={direction}
						stage={stage}
						editable={directionOpen}
					/>
				) : (
					direction && (
						<SprintDirectionView direction={direction} stage={stage} />
					)
				))
			}
		/>
	);
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

/** One lens of an AI review (frame 12.10.3): an outlined card, its heading with the lens's icon. */
export function Lens({
	icon: Icon,
	title,
	children,
}: {
	icon: TablerIcon;
	title: string;
	children: ReactNode;
}) {
	return (
		<section className={styles.lens}>
			<span className={styles.lensTitle}>
				<Icon size={14} />
				<Typography.Text className={styles.notesLabel}>{title}</Typography.Text>
			</span>
			{children}
		</section>
	);
}

/** The three lenses beside development, in the review and the curator's brief. */
/** Every lens's icon and title, for the review cards and the verdict modal alike. */
export const useLenses = () => {
	const { t } = useTranslate();
	return {
		development: {
			icon: IconCode,
			title: t("checkpoints.review.lens.development", "Development"),
		},
		marketing: {
			icon: IconSpeakerphone,
			title: t("checkpoints.review.lens.marketing", "Marketing"),
		},
		team: { icon: IconUsers, title: t("checkpoints.review.lens.team", "Team") },
		management: {
			icon: IconListCheck,
			title: t("checkpoints.review.lens.management", "Project management"),
		},
	} satisfies Record<CuratorLens, { icon: TablerIcon; title: string }>;
};

export function ReviewLensCards({
	lenses,
	curator,
}: {
	lenses: ReviewLenses;
	/** A lens the call did not touch: the curator sees why it is missing, the author nothing. */
	curator?: boolean;
}) {
	const { t } = useTranslate();
	const meta = useLenses();
	const cards = (["marketing", "team", "management"] as const).map(
		(lens) => [lens, meta[lens].icon, meta[lens].title] as const,
	);
	return cards.map(([lens, icon, title]) => {
		const text = lenses[lens];
		if (!text && !curator) return null;
		return (
			<Lens key={lens} icon={icon} title={title}>
				{text ? (
					<Typography.Text>{text}</Typography.Text>
				) : (
					<Typography.Text className={styles.tertiary}>
						{t(
							"checkpoints.call.notes.lensMissing",
							"Not covered on the call. The author does not see this lens.",
						)}
					</Typography.Text>
				)}
			</Lens>
		);
	});
}

/**
 * gP5gH: the summary, its task references read back from the plan. `review`
 * is the AI curator's: the same shape, read from what the team showed rather
 * than from a call (10.3).
 */
export function NotesSummary({
	index,
	content,
	plan,
	review,
	direction,
	curator,
}: {
	index: number;
	content: CallNotesContent;
	plan: Plan;
	review?: boolean;
	/** Under the summary: the sprint's direction, read only or the curator's to confirm (GDHUB-133). */
	direction?: ReactNode;
	curator?: boolean;
}) {
	const { t } = useTranslate();
	// The AI's review has the call notes' shape; only what each part is called differs.
	const label = review
		? {
				discussed: t("checkpoints.review.notes.byTask", "By task"),
				notDiscussed: t(
					"checkpoints.review.notes.nothingYet",
					"Nothing to show yet",
				),
				agreed: t("checkpoints.review.notes.focus", "Focus for Sprint {n}", {
					n: index,
				}),
				noQuestions: t(
					"checkpoints.review.notes.noQuestions",
					"No open questions for the team.",
				),
			}
		: {
				discussed: t("checkpoints.call.notes.discussed", "What was discussed"),
				notDiscussed: t(
					"checkpoints.call.notes.notDiscussedTitle",
					"Not discussed on this call",
				),
				agreed: t("checkpoints.call.notes.agreed", "Agreed for the next call"),
				noQuestions: t(
					"checkpoints.call.notes.noQuestions",
					"No open questions were left on the call.",
				),
			};
	const taskOf = (itemId: string | null) =>
		plan.tasks.find((task) => task.id === itemId);
	const notDiscussed = content.notDiscussed.flatMap((itemId) => {
		const task = taskOf(itemId);
		return task ? [task] : [];
	});

	const { lenses } = content;
	const discussedList = (
		<div>
			{content.discussed.map((item, position) => {
				const task = taskOf(item.itemId);
				return (
					<div key={`${item.itemId}-${position}`} className={styles.discussed}>
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
	);
	const notDiscussedGroup = notDiscussed.length > 0 && (
		<Group quiet label={label.notDiscussed}>
			{notDiscussed.map((task) => (
				<div key={task.id} className={styles.notDiscussed}>
					<IconCircleDashed size={16} />
					<Typography.Text type="secondary">{task.text}</Typography.Text>
				</div>
			))}
		</Group>
	);

	// The same three parts with or without lenses; only the labels differ.
	const development = (
		<>
			{lenses || !content.discussed.length ? (
				discussedList
			) : (
				<Group label={label.discussed}>{discussedList}</Group>
			)}
			{notDiscussedGroup}
			<Group
				label={
					lenses
						? t("checkpoints.review.lens.outside", "Outside the tasks")
						: t("checkpoints.call.notes.outsidePlan", "Outside the plan")
				}
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
		</>
	);

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
					{direction}
				</div>
			)}

			{lenses ? (
				<>
					{/* Frames 12.10.3 and 12.08.7b: the four lenses (GDHUB-126), development split within / outside the tasks. */}
					<Lens
						icon={IconCode}
						title={t("checkpoints.review.lens.development", "Development")}
					>
						{development}
					</Lens>
					<ReviewLensCards lenses={lenses} curator={curator} />
				</>
			) : (
				development
			)}

			{content.agreed.length > 0 && (
				<Group label={label.agreed}>
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
						{label.noQuestions}
					</Typography.Text>
				)}
			</Group>
		</div>
	);
}
