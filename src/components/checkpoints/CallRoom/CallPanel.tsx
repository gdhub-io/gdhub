"use client";

import { IconLock } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Segmented, Tabs, Tooltip } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { CheckpointSessionContentStatus } from "@/config/prisma-enums";
import { useCallNotes } from "@/hooks/checkpoint-call";
import type {
	CallNotesDto,
	CheckpointCallDto,
} from "@/repositories/checkpoint-call";
import { NotesBody, NotesTranscript } from "./CallNotes";
import { PlanBody, type PlanBodyProps, usePlanChange } from "./CallPlan";
import styles from "./style.module.scss";

type Session = CheckpointCallDto["sessions"][number];
export type PanelTab = "plan" | "notes" | "transcript";

// The transcript tab is built but not shown yet.
const SHOW_TRANSCRIPT = false;

/** The plan and the notes under the stage, for whichever call is picked. */
export function CallPanel({ call }: { call: CheckpointCallDto }) {
	const [selected, setSelected] = useState(call.index);
	const [picked, setPicked] = useState<PanelTab | null>(null);
	const onChange = usePlanChange(call.checkpointId);
	const held =
		call.sessions.find((session) => session.index === selected)?.held ?? false;
	const notes = useCallNotes(call.checkpointId, held ? selected : null);
	const ownReady =
		call.sessions.find((session) => session.index === call.index)
			?.contentStatus === CheckpointSessionContentStatus.Ready;

	return (
		<PanelBlock
			sessions={call.sessions}
			current={call.index}
			selected={selected}
			onSelect={setSelected}
			tab={picked ?? (ownReady ? "notes" : "plan")}
			onTab={setPicked}
			plan={call.plan}
			onChange={onChange}
			notes={notes.data}
			notesLoading={held && notes.isPending}
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
				/>
			),
		},
		{
			key: "notes",
			label: t("checkpoints.call.panel.notes", "Notes"),
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
