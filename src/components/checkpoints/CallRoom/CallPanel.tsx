"use client";

import { useTranslate } from "@tolgee/react";
import { Tabs, Typography } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import {
	type EvidenceActions,
	useEvidencePicker,
} from "@/components/checkpoints/AttachEvidenceModal/useEvidencePicker";
import { CheckpointCalendar } from "@/components/checkpoints/CheckpointCalendar";
import { SprintTab } from "@/components/WorkflowPath/SprintTab";
import { CheckpointSessionContentStatus } from "@/config/prisma-enums";
import { useCallNotes } from "@/hooks/checkpoint-call";
import { useAdvisePlan } from "@/hooks/checkpoint-review";
import { directionOpen } from "@/lib/checkpoints/call";
import { checkpointPathHref, type PathTab } from "@/lib/checkpoints/hrefs";
import type {
	CallBrief as CallBriefData,
	CallNotesDto,
	CheckpointCallDto,
} from "@/types/checkpoint-call";
import type { PlanAdvice } from "@/types/checkpoints";
import { CallBrief } from "./CallBrief";
import { NotesBody, NotesTranscript } from "./CallNotes";
import {
	adviceSlots,
	PlanBody,
	type PlanBodyProps,
	usePlanChange,
} from "./CallPlan";
import { SessionSwitcher, useSprintLabel } from "./SessionSwitcher";
import styles from "./style.module.scss";

type Session = CheckpointCallDto["sessions"][number];

// The transcript tab is built but not shown yet.
const SHOW_TRANSCRIPT = false;

/**
 * The plan and the review under the stage, for whichever call is picked. The
 * tab is the room's, so the curator's message can open the review.
 */
export function CallPanel({
	call,
	picked,
	onPick,
}: {
	call: CheckpointCallDto;
	picked: PathTab | null;
	onPick: (tab: PathTab) => void;
}) {
	const [pickedCall, setPickedCall] = useState(call.index);
	// The team's sprint is the page's own, named in its address; a curator's
	// panel picks among the calls in place.
	const selected = call.role === "team" ? call.index : pickedCall;
	const router = useRouter();
	const evidence = useEvidencePicker(call.checkpointId);
	const onChange = usePlanChange(call.checkpointId);
	const advise = useAdvisePlan(call.checkpointId);
	const held =
		call.sessions.find((session) => session.index === selected)?.held ?? false;
	const notes = useCallNotes(call.checkpointId, held ? selected : null);
	// Before the call the curator opens on the AI's brief, when there is one.
	const ownBrief =
		call.role === "curator" &&
		call.briefs.some((brief) => brief.index === call.index);
	const ownReady =
		call.sessions.find((session) => session.index === call.index)
			?.contentStatus === CheckpointSessionContentStatus.Ready;

	return (
		<>
			<PanelBlock
				sessions={call.sessions}
				current={call.index}
				reached={Math.max(call.index, call.current)}
				selected={selected}
				// The team's page is the whole sprint: picking one opens its call.
				onSelect={
					call.role === "team"
						? (at) =>
								router.push(
									checkpointPathHref(
										call.project.slug,
										call.number,
										at,
										picked ?? undefined,
									),
								)
						: setPickedCall
				}
				tab={picked ?? (ownReady ? "review" : ownBrief ? "brief" : "plan")}
				onTab={onPick}
				plan={call.plan}
				onChange={onChange}
				advise={{
					advice: call.plan.advice,
					loading: advise.isPending,
					onAdvise: () => advise.mutate(),
				}}
				checkpointId={call.checkpointId}
				stage={call.stageName}
				notes={notes.data}
				notesLoading={held && notes.isPending}
				briefs={call.role === "curator" ? call.briefs : undefined}
				sprintTab={(at) => (
					<SprintTab
						checkpointId={call.checkpointId}
						index={at}
						project={call.project}
					/>
				)}
				evidence={evidence.actions}
				calendar={<CheckpointCalendar checkpointId={call.checkpointId} />}
			/>
			{evidence.modal}
		</>
	);
}

export type PanelBlockProps = {
	sessions: Session[];
	/** The page's own call; its plan is the one that may change. */
	current: number;
	checkpointId: string;
	stage: string;
	/** The last call whose day has come; the calls after it are locked. */
	reached?: number;
	selected: number;
	onSelect: (index: number) => void;
	tab: PathTab;
	onTab: (tab: PathTab) => void;
	plan: PlanBodyProps["plan"];
	onChange: PlanBodyProps["onChange"];
	notes?: CallNotesDto;
	notesLoading: boolean;
	/** The AI's read of the draft before call 1. */
	advise?: {
		advice: PlanAdvice | null;
		loading: boolean;
		onAdvise: () => void;
	};
	/** The curator's only: the AI's briefs, by call; undefined hides the tab. */
	briefs?: CallBriefData[];
	/** The Sprint tab for a call; the stories go without it. */
	sprintTab?: (index: number) => ReactNode;
	/** Add or let go of the artifacts that prove a task; absent for whoever may not. */
	evidence?: EvidenceActions;
	/** The checkpoint's Calendar tab; the stories go without it. */
	calendar?: ReactNode;
	/** For stories: what "today" is. */
	now?: Date;
};

/** Frames gP5gH (Notes) and Ovz5i / NBTnm / NBWf6 (Plan). */
export function PanelBlock({
	checkpointId,
	stage,
	sessions,
	current,
	reached = current,
	selected,
	onSelect,
	tab,
	onTab,
	plan,
	onChange,
	notes,
	notesLoading,
	advise,
	briefs,
	sprintTab,
	evidence,
	calendar,
	now,
}: PanelBlockProps) {
	const { t } = useTranslate();
	const today = dayjs(now);
	const held =
		sessions.find((session) => session.index === selected)?.held ?? false;

	const sprintLabel = useSprintLabel();
	const switcher = (
		<SessionSwitcher
			value={selected}
			onChange={onSelect}
			aheadLabel={t("checkpoints.call.panel.ahead", "This call is still ahead")}
			options={sessions.map((session) => {
				const date = dayjs(session.scheduledAt);
				const when = date.isSame(today, "day")
					? t("checkpoints.call.panel.todayWord", "today")
					: date.format("D MMM");
				// Call N opens sprint N; the last one closes the checkpoint.
				return {
					value: session.index,
					ahead: session.index > reached,
					label: sprintLabel(session.index, when),
				};
			})}
		/>
	);

	// What this sprint asks, then what happened (the brief, the call), the whole plan.
	const items: { key: PathTab; label: string; children: ReactNode }[] = [];
	if (sprintTab) {
		items.push({
			key: "sprint",
			label: t("checkpoints.call.panel.sprint", "Sprint"),
			children: <>{sprintTab(selected)}</>,
		});
	}
	if (briefs) {
		const brief = briefs.find((row) => row.index === selected);
		items.push({
			key: "brief",
			label: t("checkpoints.call.brief.tab", "Brief"),
			children: brief ? (
				<CallBrief brief={brief} tasks={plan.tasks} />
			) : (
				<Typography.Text type="secondary" className={styles.briefEmpty}>
					{t(
						"checkpoints.call.brief.none",
						"No brief for this call. The AI writes one the night before calls 2–5.",
					)}
				</Typography.Text>
			),
		});
	}
	items.push({
		key: "review",
		label: t("checkpoints.call.panel.review", "Review"),
		children: (
			<NotesBody
				checkpointId={checkpointId}
				stage={stage}
				curator={!!briefs}
				directionOpen={directionOpen(sessions, selected, now)}
				index={selected}
				held={held}
				plan={plan}
				notes={notes}
				loading={notesLoading}
			/>
		),
	});
	items.push({
		key: "plan",
		label: t("checkpoints.call.panel.plan", "Plan"),
		children: (
			<PlanBody
				// One plan for every call; only the page's own call may change it.
				plan={selected === current ? plan : { ...plan, edit: null }}
				onChange={onChange}
				evidence={evidence}
				// Before call 1 the AI reads the author's draft.
				{...(advise &&
					selected === current &&
					plan.edit === "plan" && {
						advice: advise.advice,
						...adviceSlots({
							// The draft is free until call 1; on it, the plan is agreed.
							until:
								sessions.find((session) => session.index === current)
									?.scheduledAt ?? null,
							loading: advise.loading,
							onAdvise: advise.onAdvise,
							sessionIndex: current,
						}),
					})}
			/>
		),
	});
	if (calendar) {
		items.push({
			key: "calendar",
			label: t("checkpoints.calendar.tab", "Calendar"),
			children: calendar,
		});
	}
	if (SHOW_TRANSCRIPT && held) {
		items.push({
			key: "transcript",
			label: t("checkpoints.call.notes.transcript", "Transcript"),
			children: <NotesTranscript notes={notes} loading={notesLoading} />,
		});
	}

	return (
		<section className={styles.panel}>
			<Tabs
				activeKey={tab}
				onChange={(key) => onTab(key as PathTab)}
				// The calendar is the whole checkpoint, not one call.
				tabBarExtraContent={{ right: tab !== "calendar" && switcher }}
				items={items}
				size="large"
				className={styles.panelTabs}
			/>
		</section>
	);
}
