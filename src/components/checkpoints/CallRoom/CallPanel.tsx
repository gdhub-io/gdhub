"use client";

import { IconLock } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Segmented, Tabs, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { CheckpointSessionContentStatus } from "@/config/prisma-enums";
import { useCallNotes } from "@/hooks/checkpoint-call";
import { useAdvisePlan } from "@/hooks/checkpoint-review";
import type {
	CallNotesDto,
	CheckpointCallDto,
} from "@/repositories/checkpoint-call";
import type { CallBrief as CallBriefData } from "@/repositories/curator-journal";
import type { PlanAdvice } from "@/types/checkpoints";
import { CallBrief } from "./CallBrief";
import { NotesBody, NotesTranscript } from "./CallNotes";
import {
	adviceSlots,
	PlanBody,
	type PlanBodyProps,
	usePlanChange,
} from "./CallPlan";
import styles from "./style.module.scss";

type Session = CheckpointCallDto["sessions"][number];
export type PanelTab = "plan" | "notes" | "brief" | "transcript";

// The transcript tab is built but not shown yet.
const SHOW_TRANSCRIPT = false;

/**
 * The plan and the notes under the stage, for whichever call is picked. The
 * tab is the room's, so the curator's message can open the notes.
 */
export function CallPanel({
	call,
	picked,
	onPick,
}: {
	call: CheckpointCallDto;
	picked: PanelTab | null;
	onPick: (tab: PanelTab) => void;
}) {
	const [selected, setSelected] = useState(call.index);
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
		<PanelBlock
			sessions={call.sessions}
			current={call.index}
			selected={selected}
			onSelect={setSelected}
			tab={picked ?? (ownReady ? "notes" : ownBrief ? "brief" : "plan")}
			onTab={onPick}
			plan={call.plan}
			onChange={onChange}
			advise={{
				advice: call.plan.advice,
				loading: advise.isPending,
				onAdvise: () => advise.mutate(),
			}}
			notes={notes.data}
			notesLoading={held && notes.isPending}
			briefs={call.role === "curator" ? call.briefs : undefined}
		/>
	);
}

export type PanelBlockProps = {
	sessions: Session[];
	/** The page's own call; the calls after it are locked. */
	current: number;
	selected: number;
	onSelect: (index: number) => void;
	tab: PanelTab;
	onTab: (tab: PanelTab) => void;
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
	/** For stories: what "today" is. */
	now?: Date;
};

/** Frames gP5gH (Notes) and Ovz5i / NBTnm / NBWf6 (Plan). */
export function PanelBlock({
	sessions,
	current,
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
	now,
}: PanelBlockProps) {
	const { t } = useTranslate();
	const today = dayjs(now);
	const held =
		sessions.find((session) => session.index === selected)?.held ?? false;

	const switcher = (
		<div className={styles.switcher}>
			<Segmented<number>
				value={selected}
				onChange={onSelect}
				options={sessions.map((session) => {
					const date = dayjs(session.scheduledAt);
					const label = date.isSame(today, "day")
						? t("checkpoints.call.panel.today", "Call {index} · today", {
								index: session.index,
							})
						: t("checkpoints.call.notes.option", "Call {index} · {date}", {
								index: session.index,
								date: date.format("D MMM"),
							});
					const ahead = session.index > current;
					return {
						value: session.index,
						disabled: ahead,
						label: ahead ? (
							<Tooltip
								title={t(
									"checkpoints.call.panel.ahead",
									"This call is still ahead",
								)}
							>
								<span className={styles.lockedOption}>
									<IconLock size={14} />
									{label}
								</span>
							</Tooltip>
						) : (
							label
						),
					};
				})}
			/>
		</div>
	);

	const items = [
		{
			key: "plan",
			label: t("checkpoints.call.panel.plan", "Plan"),
			children: (
				<PlanBody
					// One plan for every call; only the page's own call may change it.
					plan={selected === current ? plan : { ...plan, edit: null }}
					onChange={onChange}
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
		},
		{
			key: "notes",
			label: t("checkpoints.call.panel.review", "Review"),
			children: (
				<NotesBody
					index={selected}
					held={held}
					plan={plan}
					notes={notes}
					loading={notesLoading}
				/>
			),
		},
	];
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
				onChange={(key) => onTab(key as PanelTab)}
				tabBarExtraContent={{ right: switcher }}
				items={items}
				size="large"
				className={styles.panelTabs}
			/>
		</section>
	);
}
