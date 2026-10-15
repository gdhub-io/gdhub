import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";
import { GoalCard } from "@/components/checkpoints/CallRoom/CallGoal";
import { CallHeader } from "@/components/checkpoints/CallRoom/CallHeader";
import {
	PanelBlock,
	type PanelTab,
} from "@/components/checkpoints/CallRoom/CallPanel";
import {
	CallLayout,
	LiveStage,
	ParticipantTile,
} from "@/components/checkpoints/CallRoom/CallParts";
import { ClosedStage } from "@/components/checkpoints/CallRoom/ClosedStage";
import type { CheckpointCallDto } from "@/repositories/checkpoint-call";
import type { CheckpointReviewDto } from "@/repositories/checkpoint-review";
import type {
	CallNotes,
	CuratorReview,
	PreviousVerdict as PreviousVerdictDto,
} from "@/types/checkpoints";
import { AiReviewView } from "./AiReview";
import { PreviousVerdict } from "./PreviousVerdict";

/**
 * One checkpoint, 1–29 Oct, seen by its team on four days — through sprint 1,
 * on the first day of sprint 3 (where the tasks change for the last time), on
 * the last day of sprint 4 and on day 29 — once with a pro curator, once with
 * the AI. The Workflow sidebar is left out: it is the same on every day.
 */

const noop = () => undefined;
const saved = () => Promise.resolve();
const GOAL =
	"A playable greybox of the tide loop that a stranger can finish in 10 minutes";
const DAYS = [
	"2026-10-01",
	"2026-10-08",
	"2026-10-15",
	"2026-10-22",
	"2026-10-29",
];

const previous: PreviousVerdictDto = {
	checkpointId: "cp2",
	number: 2,
	verdict: "GoalMissed",
	note: "The pitch is sharp and the mood board sets one clear direction. The video moves to this checkpoint.",
};

type Task = CheckpointCallDto["plan"]["tasks"][number];
const task = (id: string, text: string, extra: Partial<Task> = {}): Task => ({
	id,
	text,
	cut: false,
	addedAt: null,
	artifact: null,
	...extra,
});
const onePager = task("t1", "Core loop one-pager", {
	artifact: {
		id: "a1",
		name: "Core loop",
		type: "GDD",
		link: "https://example.com/core-loop",
		checkStatus: null,
	},
});
const startTasks = [
	task("t1", "Core loop one-pager"),
	task("t2", "Greybox build with 3 islands on itch.io"),
	task("t3", "Make the game feel better"),
	task("t4", "Trailer cut for the store page"),
];
const midTasks = [onePager, ...startTasks.slice(1)];
const lateTasks = [
	onePager,
	task("t2", "Greybox build with 1 island on itch.io"),
	task("t3", "Make the game feel better", { cut: true }),
	task("t4", "Trailer cut for the store page", { cut: true }),
	task("t5", "3 playtest recordings with strangers", {
		addedAt: "2026-10-15T09:00:00.000Z",
	}),
];

const notes = (sprint: number, final = false): CallNotes => ({
	inShort: final
		? "Four weeks, and the goal is reached: the one-island greybox is on itch.io and three strangers finished it, the fastest in 7 minutes."
		: sprint === 0
			? "The plan is set: four tasks toward a greybox a stranger can finish. The risk is scope — three islands may not fit in four weeks."
			: `Sprint ${sprint}: the loop runs end to end and the first island is blocked out. The risk is scope — three islands will not fit.`,
	discussed: [
		{ itemId: "t1", text: "The one-pager is done and pins down the finish." },
		{
			itemId: "t2",
			text: "One island is blocked out; outrunning the tide works in 3 of 5 tries.",
		},
	],
	notDiscussed: ["t3"],
	outsidePlan: [],
	agreed: final
		? []
		: [
				{ text: "Slow the first two tide cycles", itemId: "t2", dueDay: null },
				{ text: "Playtest with three strangers", itemId: null, dueDay: null },
			],
	questions: final
		? []
		: ["Does a run still fit in 10 minutes once the tide is slower?"],
});

// Pro: the call room, its panel and the curator's dark panel around the call.

const proCall = (
	index: number,
	state: CheckpointCallDto["state"],
	held: number,
	tasks: Task[],
	edit: CheckpointCallDto["plan"]["edit"] = null,
): CheckpointCallDto => ({
	checkpointId: "cp3",
	previous: index === 1 ? previous : null,
	index,
	number: 3,
	stageName: "Concepting",
	project: { id: "p1", name: "Hollow Tide", slug: "hollow-tide" },
	curator: { id: "u-curator", name: "Patrick Novak", image: null },
	scheduledAt: `${DAYS[index - 1]}T12:00:00.000Z`,
	state,
	curatorJoinedAt: state === "open" ? `${DAYS[index - 1]}T11:58:00.000Z` : null,
	role: "team",
	plan: { goal: GOAL, goalAgreedAt: "2026-10-01T12:45:00.000Z", edit, tasks },
	sessions: DAYS.map((day, offset) => ({
		index: offset + 1,
		scheduledAt: `${day}T12:00:00.000Z`,
		held: offset < held,
		contentStatus: offset < held ? "Ready" : null,
	})),
});

function ProPage({
	call,
	now,
	shown,
	tab: initialTab,
	live,
}: {
	call: CheckpointCallDto;
	now: string;
	/** The call the panel opens on. */
	shown: number;
	tab: PanelTab;
	live?: boolean;
}) {
	const [selected, setSelected] = useState(shown);
	const [tab, setTab] = useState(initialTab);
	const held = call.sessions.find(
		(session) => session.index === selected,
	)?.held;

	return (
		<CallLayout
			header={
				<CallHeader
					call={call}
					backHref="/user/project/hollow-tide/workflow"
					joined={!!live}
					onChat={noop}
					onCopyLink={noop}
					onLeave={noop}
					now={new Date(now)}
				/>
			}
			stage={
				live ? (
					<LiveStage
						count={3}
						recording
						mic={{ on: true, onToggle: noop }}
						camera={{ on: true, onToggle: noop }}
						sharing={{ on: false, onToggle: noop }}
						fullscreen={{ on: false, onToggle: noop }}
					>
						{["Patrick Novak", "Marta Ilves", "Oleg Kim"].map((name, i) => (
							<ParticipantTile
								key={name}
								name={name}
								role={i === 0 ? "Curator" : undefined}
								muted={i === 2}
								speaking={i === 0}
							/>
						))}
					</LiveStage>
				) : (
					<ClosedStage
						call={call}
						notesReady={call.sessions[call.index - 1].held}
						onChat={noop}
						onOpenReview={() => setTab("notes")}
					/>
				)
			}
			below={
				<>
					{call.previous && (
						<PreviousVerdict previous={call.previous} resultsHref="#" />
					)}
					<GoalCard goal={GOAL} editable={false} />
					<PanelBlock
						sessions={call.sessions}
						current={call.index}
						selected={selected}
						onSelect={setSelected}
						tab={tab}
						onTab={setTab}
						plan={call.plan}
						onChange={saved}
						notes={
							held
								? {
										contentStatus: "Ready",
										content: notes(selected - 1, selected === 5),
										transcript: null,
									}
								: undefined
						}
						notesLoading={false}
						now={new Date(now)}
					/>
				</>
			}
		/>
	);
}

// AI: the review page from its data.

const advice = (tasks: CuratorReview["advice"]): CuratorReview["advice"] =>
	tasks;

const aiReview = (
	current: number,
	tasks: Task[],
	plan: Pick<CheckpointReviewDto["plan"], "edit" | "editUntil">,
	contents: (CuratorReview | null)[],
	extra: Partial<CheckpointReviewDto> = {},
): CheckpointReviewDto => ({
	current,
	number: 3,
	previous: null,
	stageName: "Concepting",
	startedAt: "2026-10-01T00:00:00.000Z",
	dueAt: "2026-10-28T00:00:00.000Z",
	project: { id: "p1", name: "Hollow Tide", slug: "hollow-tide" },
	plan: { goal: GOAL, ...plan, tasks },
	sessions: DAYS.map((day, offset) => ({
		index: offset + 1,
		scheduledAt: `${day}T00:00:00.000Z`,
		contentStatus: contents[offset] ? "Ready" : null,
		content: contents[offset] ?? null,
	})),
	verdict: null,
	nextStage: null,
	...extra,
});

const startContent: CuratorReview = {
	message:
		"Hi, I'm your curator for the next four weeks. The one-pager is a good first task. The greybox is heavy for week one, and nobody could check that the game “feels better”. Change them below, or keep them — it's your call.",
	notes: null,
	advice: advice({
		hash: "start",
		add: ["3 playtest recordings with strangers"],
		tasks: [
			{
				itemId: "t1",
				kind: "clear",
				note: "Keep it: it ends in a document anyone can open.",
				suggestion: null,
			},
			{
				itemId: "t2",
				kind: "risky",
				note: "Move it to sprint 3: three islands in week one leaves no room for the one-pager.",
				suggestion: null,
			},
			{
				itemId: "t3",
				kind: "vague",
				note: "Reword it: nobody can check “better”.",
				suggestion: "Jump and landing tuned, shown in a 30-second clip",
			},
			{
				itemId: "t4",
				kind: "cut",
				note: "Drop it: a trailer does not test whether a stranger can finish the loop.",
				suggestion: null,
			},
		],
	}),
};
const reviewContent = (
	sprint: number,
	message: string,
	extra?: Partial<CuratorReview>,
): CuratorReview => ({
	message,
	notes: notes(sprint),
	advice: null,
	...extra,
});
const sprint1 = reviewContent(
	1,
	"Good start: the one-pager is done and the first island is blocked out. Three islands won't fit in 28 days — put one in front of strangers before building the next.",
);
const sprint2 = reviewContent(
	2,
	"Halfway. Today is the last chance to change the tasks: shorten the greybox to one island, drop the trailer and the vague polish, add three playtests with strangers.",
	{
		advice: advice({
			hash: "mid",
			add: ["3 playtest recordings with strangers"],
			tasks: [
				{
					itemId: "t2",
					kind: "shorten",
					note: "Shorten it: one island is blocked out after two sprints and still proves the loop.",
					suggestion: "Greybox build with 1 island on itch.io",
				},
				{
					itemId: "t3",
					kind: "cut",
					note: "Drop it: nothing checkable, and it takes time from the playable build.",
					suggestion: null,
				},
				{
					itemId: "t4",
					kind: "cut",
					note: "Drop it: nothing started, and it is not part of the goal.",
					suggestion: null,
				},
			],
		}),
	},
);
const sprint3 = reviewContent(
	3,
	"The one-island build is on itch.io and two strangers played it. One week left: get the third recording and slow the first tide, then you're done.",
);
const final: CuratorReview = {
	message:
		"Four weeks, and the goal is reached: every task has something anyone can open, and a stranger finished the greybox in under ten minutes. Cutting the trailer at the right moment is what made it fit.",
	notes: notes(4, true),
	advice: null,
};

function AiPage({
	review,
	index,
}: {
	review: CheckpointReviewDto;
	index: number;
}) {
	return (
		<AiReviewView
			review={review}
			index={index}
			backHref="/user/project/hollow-tide/workflow"
			onChange={saved}
			onAdvise={noop}
			advising={false}
		/>
	);
}

const meta: Meta = {
	title: "Checkpoints/Curator's Review/The path",
	parameters: { layout: "padded", nextjs: { appDirectory: true } },
	decorators: [
		(Story) => (
			<div style={{ maxWidth: 1200 }}>
				<Story />
			</div>
		),
	],
};
export default meta;

type Story = StoryObj;

/** Day 3: call 1 set the plan; the last checkpoint's verdict still frames it. */
export const ProSprint1: Story = {
	name: "Pro · sprint 1 (day 3)",
	render: () => (
		<ProPage
			call={proCall(1, "over", 1, startTasks)}
			now="2026-10-03T10:00:00.000Z"
			shown={1}
			tab="notes"
		/>
	),
};

/** Day 15, during call 3: the last change to the tasks, on the call. */
export const ProSprint3Day1: Story = {
	name: "Pro · first day of sprint 3 (day 15, in the call)",
	render: () => (
		<ProPage
			call={proCall(3, "open", 2, midTasks, "tasks")}
			now="2026-10-15T12:20:00.000Z"
			shown={3}
			tab="plan"
			live
		/>
	),
};

/** Day 28: the final call is tomorrow; the last review is call 4's. */
export const ProLastDay: Story = {
	name: "Pro · last day of sprint 4 (day 28)",
	render: () => (
		<ProPage
			call={proCall(5, "early", 4, lateTasks)}
			now="2026-10-28T10:00:00.000Z"
			shown={4}
			tab="notes"
		/>
	),
};

/** Day 29: the final call is over; the verdict is the curator's to write. */
export const ProDay29: Story = {
	name: "Pro · day 29",
	render: () => (
		<ProPage
			call={proCall(5, "over", 5, lateTasks)}
			now="2026-10-29T15:00:00.000Z"
			shown={5}
			tab="notes"
		/>
	),
};

/** Day 2: the tasks are set with the AI's advice; the last verdict above. */
export const AiSprint1: Story = {
	name: "AI · sprint 1 (day 2)",
	render: () => (
		<AiPage
			index={1}
			review={aiReview(
				1,
				startTasks,
				{ edit: "plan", editUntil: "2026-10-03T00:00:00.000Z" },
				[startContent],
				{ previous },
			)}
		/>
	),
};

/** Day 15: the sprint 2 review, and the last change to the tasks. */
export const AiSprint3Day1: Story = {
	name: "AI · first day of sprint 3 (day 15)",
	render: () => (
		<AiPage
			index={3}
			review={aiReview(
				3,
				midTasks,
				{ edit: "tasks", editUntil: "2026-10-16T01:00:00.000Z" },
				[startContent, sprint1, sprint2],
			)}
		/>
	),
};

/** Day 28: the plan is fixed; the sprint 3 review is the latest word. */
export const AiLastDay: Story = {
	name: "AI · last day of sprint 4 (day 28)",
	render: () => (
		<AiPage
			index={4}
			review={aiReview(4, lateTasks, { edit: null, editUntil: null }, [
				startContent,
				sprint1,
				sprint2,
				sprint3,
			])}
		/>
	),
};

/** Day 29: the verdict, and the way on to the next stage. */
export const AiDay29: Story = {
	name: "AI · day 29",
	render: () => (
		<AiPage
			index={5}
			review={aiReview(
				5,
				lateTasks.map((row) =>
					row.cut || row.artifact
						? row
						: {
								...row,
								artifact: {
									id: `a-${row.id}`,
									name: row.text,
									type: "GameplayVideo" as const,
									link: "https://example.com",
									checkStatus: "Readable" as const,
								},
							},
				),
				{ edit: null, editUntil: null },
				[startContent, sprint1, sprint2, sprint3, final],
				{
					verdict: { verdict: "StageClosed", note: final.message },
					nextStage: {
						name: "Prototyping",
						key: "workflow.default.step3.name",
					},
				},
			)}
		/>
	),
};
