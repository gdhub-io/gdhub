import type { Meta, StoryObj } from "@storybook/nextjs";
import { withQueries } from "@/mocks/queries";
import type {
	AdminCheckpointRowDto,
	CuratorJournalEntryDto,
} from "@/types/checkpoints";
import { CuratorJournalDrawer } from ".";

const KEY = ["admin", "checkpoints", "journal", "cp1"];

const checkpoint = {
	id: "cp1",
	number: 2,
	projectName: "Hollow Tide",
	stageName: "Prototyping",
	aiCost: 42,
} as AdminCheckpointRowDto;

const read = (over: object) => ({
	opened: "https://example.com/x",
	text: null,
	images: 1,
	videoSeconds: 0,
	unread: null,
	...over,
});

const ENTRIES: CuratorJournalEntryDto[] = [
	{
		id: "v",
		kind: "Verdict",
		sprint: 4,
		link: null,
		input: null,
		output: {
			proposed: "GoalMet",
			settled: "GoalMissed",
			overrode: "GoalMet",
			unproven: [{ id: "o2" }, { id: "o3" }],
		},
		createdAt: "2026-09-28T09:12:00.000Z",
	},
	{
		id: "r",
		kind: "Review",
		sprint: 4,
		link: null,
		input: { goal: "A playable greybox" },
		output: {
			summary:
				"The core loop is playable end to end; the one-pager shows dice, not the loop.",
		},
		createdAt: "2026-09-28T09:11:00.000Z",
	},
	{
		id: "e1",
		kind: "Evidence",
		sprint: 3,
		link: "https://drive.google.com/file/d/1xQ/view",
		input: read({
			task: "Core loop described on one page",
			artifactName: "Core loop one-pager",
		}),
		output: {
			match: "DoesNotMatch",
			note: "A photo of dice on a table, no text about the loop.",
		},
		createdAt: "2026-09-19T18:40:00.000Z",
	},
	{
		id: "d1",
		kind: "DevlogMedia",
		sprint: 3,
		link: "https://youtu.be/aB3",
		input: read({
			devlog: "Week 3: the boss fight",
			unread:
				"a youtube video: only its title and thumbnail, the video itself was not watched",
		}),
		output: {
			shows: "A boss arena with a red-lit stone floor; the player mid-dodge.",
		},
		createdAt: "2026-09-18T21:05:00.000Z",
	},
	{
		id: "e2",
		kind: "Evidence",
		sprint: 3,
		link: "https://notion.so/hollowtide/playtest-2",
		input: read({
			task: "Playtest with three new players",
			artifactName: "Playtest notes",
			images: 0,
			unread: "the link asks for a login",
		}),
		output: { match: "CannotTell", note: "the link asks for a login" },
		createdAt: "2026-09-16T11:02:00.000Z",
	},
];

const meta: Meta<typeof CuratorJournalDrawer> = {
	title: "Admin/CuratorJournalDrawer",
	component: CuratorJournalDrawer,
	args: { checkpoint, onClose: () => {} },
};

export default meta;

type Story = StoryObj<typeof CuratorJournalDrawer>;

/** Frame 11.10 (`ZDVkr`). */
export const Journal: Story = {
	decorators: [withQueries({ key: KEY, data: ENTRIES })],
};

/** Frame 11.10b (`PJult`). */
export const Empty: Story = {
	decorators: [withQueries({ key: KEY, data: [] })],
};

/** Frame 11.10c (`T5SpI`). */
export const Loading: Story = {
	decorators: [withQueries({ key: KEY, state: "pending" })],
};

/** Frame 11.10d (`p8Yynl`). */
export const LoadFailed: Story = {
	decorators: [withQueries({ key: KEY, state: "error" })],
};
