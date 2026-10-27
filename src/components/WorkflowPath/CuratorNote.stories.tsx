import type { Meta, StoryObj } from "@storybook/nextjs";
import {
	CheckpointCuratorKind,
	CheckpointSessionContentStatus,
} from "@/config/prisma-enums";
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

const ai = {
	curatorKind: CheckpointCuratorKind.AI,
	curator: null,
	goalAgreedAt: "2026-10-01T15:00:00Z",
	letter: {
		index: 1,
		at: "2026-10-01T00:00:00Z",
		text: "Day 1: the route to the first island is laid. Keep the demo to one route with the core mechanic, and tell me the programmer's hours before you approve the plan. I look forward to your first build ;)",
	},
} as CheckpointDto;

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

/** 12.10: the AI curator's last letter. */
export const AiLetter: Story = { args: { checkpoint: ai } };

/** Day 1, the first letter still on its way. */
export const AiLetterOnItsWay: Story = {
	args: { checkpoint: { ...ai, letter: null, goalAgreedAt: null } },
};
