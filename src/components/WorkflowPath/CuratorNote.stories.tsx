import type { Meta, StoryObj } from "@storybook/nextjs";
import {
	CheckpointCuratorKind,
	CheckpointSessionContentStatus,
} from "@/config/prisma-enums";
import type { CuratorNow } from "@/lib/curator-now";
import type { CheckpointDto, CheckpointSessionDto } from "@/types/checkpoints";
import { CuratorNote } from "./CuratorNote";

// Frames 12.07 / 12.08 / 12.10: a checkpoint that started on 1 Oct, seen on the 7th.
const now = new Date("2026-10-07T10:00:00Z");

const session = (
	index: number,
	scheduledAt: string,
	over = false,
): CheckpointSessionDto => ({
	index,
	day: (index - 1) * 7 + 1,
	scheduledAt,
	timeKnown: true,
	rescheduledAt: null,
	curatorJoinedAt: null,
	endedAt: over ? scheduledAt : null,
	contentStatus: over ? CheckpointSessionContentStatus.Ready : null,
	missed: false,
});

const pro = {
	curatorKind: CheckpointCuratorKind.Human,
	curator: { id: "c1", name: "Patrick Novak", image: null },
	goalAgreedAt: "2026-10-01T15:00:00Z",
	sessions: [
		session(1, "2026-10-01T14:00:00Z", true),
		session(2, "2026-10-08T14:00:00Z"),
	],
} as CheckpointDto;

const said = (
	state: CuratorNow["state"],
	text: string | null,
	extra: Partial<CuratorNow> = {},
): CuratorNow => ({
	state,
	index: 1,
	at: "2026-10-01T00:00:00Z",
	text,
	until: null,
	nextAt: null,
	...extra,
});

const ai = (curatorNow: CuratorNow) =>
	({
		id: "cp-ai",
		curatorKind: CheckpointCuratorKind.AI,
		curator: null,
		curatorNow,
	}) as CheckpointDto;

const meta: Meta<typeof CuratorNote> = {
	title: "Checkpoints/Workflow/CuratorNote",
	component: CuratorNote,
	args: {
		reviewHref: (index: number) =>
			`/user/project/hollow-tide/workflow/cp3/review/${index}`,
		onChat: () => {},
		chatLoading: false,
		now,
	},
	decorators: [
		(Story) => (
			<div style={{ width: 300 }}>
				<Story />
			</div>
		),
	],
};
export default meta;

type Story = StoryObj<typeof CuratorNote>;

/** 12.07: between calls — the review of the last one, and the next call. */
export const ProBetweenCalls: Story = { args: { checkpoint: pro } };

/** 12.08: the call is on now. */
export const ProCallLive: Story = {
	args: { checkpoint: pro, now: new Date("2026-10-08T14:05:00Z") },
};

/** The curator never joined call 2: said so, with the call after it. */
export const ProCallMissed: Story = {
	args: {
		checkpoint: {
			...pro,
			sessions: [
				session(1, "2026-10-01T14:00:00Z", true),
				{ ...session(2, "2026-10-08T14:00:00Z"), missed: true },
				session(3, "2026-10-15T14:00:00Z"),
			],
		},
		now: new Date("2026-10-09T10:00:00Z"),
	},
};

/** Day 1, the first letter still being written. */
export const AiReading: Story = {
	args: { checkpoint: ai(said("reading", null)) },
};

/** Day 1: the first letter asks for the tasks. */
export const AiTasksWanted: Story = {
	args: {
		checkpoint: ai(
			said(
				"tasksWanted",
				"Ahoy! Captain Flint here. The route to the first island is laid — write me your tasks and I'll check them.",
			),
		),
	},
};

/** Day 1: the tasks are checked; approve, or it approves itself. */
export const AiApproveWanted: Story = {
	args: {
		checkpoint: ai(
			said(
				"approveWanted",
				"Day 1: the route holds. Keep the demo to one route with the core mechanic.",
				{ until: "2026-10-01T22:00:00Z" },
			),
		),
	},
};

/** Sprint 1: the plan is approved — the letter read until the day-8 review. */
export const AiPlanReady: Story = {
	args: {
		checkpoint: ai(
			said(
				"planReady",
				"The sails are up — the plan is ready. Log the voyage in your devlog and pin to each task what proves it done. In a week I'll board and see what's new.",
			),
		),
	},
};

/** Day 8 before the run: the sprint is being read. */
export const AiSprintReading: Story = {
	args: {
		checkpoint: ai(
			said("sprintReading", null, { index: 2, at: "2026-10-08T00:00:00Z" }),
		),
	},
};

/** Day 15: the review, with the change to the tasks still open. */
export const AiScopeOpen: Story = {
	args: {
		checkpoint: ai(
			said(
				"scopeOpen",
				"Half the road behind. Drop the trailer, keep the loop.",
				{
					index: 3,
					at: "2026-10-15T00:00:00Z",
					until: "2026-10-16T01:00:00Z",
				},
			),
		),
	},
};

/** 12.10: the AI curator's last review. */
export const AiReview: Story = {
	args: {
		checkpoint: ai(
			said("review", "The first island is behind you. Now the reef.", {
				index: 2,
				at: "2026-10-08T00:00:00Z",
			}),
		),
	},
};
