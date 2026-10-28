import type { Meta, StoryObj } from "@storybook/nextjs";
import { withQueries } from "@/mocks/queries";
import type {
	CuratorJournalViewDto,
	JournalMessageDto,
} from "@/repositories/curator-journal-view";
import type { AdminCheckpointRowDto } from "@/types/checkpoints";
import { CuratorJournalDrawer } from ".";

const KEY = ["admin", "checkpoints", "journal", "cp1"];

const checkpoint = {
	id: "cp1",
	number: 2,
	projectName: "Hollow Tide",
	stageName: "Prototyping",
	aiCost: 42,
} as AdminCheckpointRowDto;

const message = (
	over: Partial<JournalMessageDto> &
		Pick<JournalMessageDto, "id" | "at" | "side" | "kind">,
): JournalMessageDto => ({
	sprint: null,
	variant: null,
	who: null,
	title: null,
	text: null,
	match: null,
	unread: null,
	verdict: null,
	details: [],
	source: { input: {}, output: {} },
	...over,
});

const read = {
	opened: "https://example.com/x",
	text: "…",
	images: 1,
	videoSeconds: 40,
	unread: null,
};

const VIEW: CuratorJournalViewDto = {
	curator: { name: "Luna", avatar: null, ai: true },
	startedAt: "2026-09-01T00:00:00.000Z",
	sprints: [1, 2, 3, 4].map((number) => ({
		number,
		from: `2026-09-${String(1 + (number - 1) * 7).padStart(2, "0")}T00:00:00.000Z`,
		to: `2026-09-${String(number * 7).padStart(2, "0")}T00:00:00.000Z`,
	})),
	finishedAt: "2026-09-29T01:02:00.000Z",
	verdict: {
		verdict: "StageClosed",
		note: "All three tasks are delivered and the stage's devlog is out.",
	},
	messages: [
		message({
			id: "m1",
			at: "2026-09-01T09:00:00.000Z",
			sprint: 1,
			side: "curator",
			kind: "letter",
			variant: "first",
			text: "Ahoy. Your goal is a playable slice of the first island; tell me the tasks that get you there.",
		}),
		message({
			id: "m2",
			at: "2026-09-01T14:20:00.000Z",
			sprint: 1,
			side: "team",
			kind: "tasksSent",
			who: "Marta",
		}),
		message({
			id: "m3",
			at: "2026-09-01T14:21:00.000Z",
			sprint: 1,
			side: "curator",
			kind: "letter",
			variant: "tasksCheck",
			text: "The demo and the playtest hold. Shorten the style board to one hero sheet.",
		}),
		message({
			id: "m4",
			at: "2026-09-01T18:02:00.000Z",
			sprint: 1,
			side: "team",
			kind: "planApproved",
			who: "Marta",
		}),
		message({
			id: "m5",
			at: "2026-09-05T18:40:00.000Z",
			sprint: 1,
			side: "team",
			kind: "artifact",
			variant: "ExecutableBuild",
			who: "Ivo",
			title: "Island demo 0.1",
			details: [
				{ label: "task", value: "Playable island demo on itch.io" },
				{ label: "link", value: "https://hollowtide.itch.io/demo" },
			],
		}),
		message({
			id: "m6",
			at: "2026-09-05T18:41:00.000Z",
			sprint: 1,
			side: "curator",
			kind: "looked",
			variant: "evidence",
			title: "Island demo 0.1",
			text: "An itch.io page with a playable web build of the island.",
			match: "Matches",
			source: { input: read, output: {} },
		}),
		message({
			id: "m7",
			at: "2026-09-08T01:06:00.000Z",
			sprint: 2,
			side: "platform",
			kind: "sent",
			who: "Marta",
			title: "The Sprint 1 review of Hollow Tide is ready",
		}),
		message({
			id: "m8",
			at: "2026-09-08T01:04:00.000Z",
			sprint: 2,
			side: "curator",
			kind: "letter",
			variant: "review",
			title: "1",
			text: "On course: the island opens and walks. Next, book the playtest.",
		}),
		message({
			id: "m9",
			at: "2026-09-27T09:12:00.000Z",
			sprint: 4,
			side: "team",
			kind: "pulse",
			who: "Tom",
		}),
		message({
			id: "m10",
			at: "2026-09-29T01:02:00.000Z",
			sprint: null,
			side: "platform",
			kind: "verdict",
			verdict: { proposed: "StageClosed", settled: "StageClosed", by: "ai" },
			text: "All three tasks are delivered.",
		}),
	],
	plan: {
		goal: "A playable vertical slice of the first island",
		sentAt: "2026-09-01T14:20:00.000Z",
		approvedAt: "2026-09-01T18:02:00.000Z",
		approvedBy: "Marta",
		confirmedAt: "2026-09-16T00:40:00.000Z",
		tasks: [
			{
				id: "o1",
				text: "Playable island demo on itch.io",
				firstWording: null,
				cut: false,
				addedAt: null,
				artifact: {
					name: "Island demo 0.1",
					type: "ExecutableBuild",
					link: "https://hollowtide.itch.io/demo",
				},
				doneIn: 1,
				match: "Matches",
				note: null,
			},
			{
				id: "o2",
				text: "Art style board: palette and one hero sheet",
				firstWording: "Art style board: palette and two hero sheets",
				cut: false,
				addedAt: null,
				artifact: null,
				doneIn: null,
				match: null,
				note: null,
			},
			{
				id: "o3",
				text: "Fog shader pass",
				firstWording: null,
				cut: true,
				addedAt: null,
				artifact: null,
				doneIn: null,
				match: null,
				note: null,
			},
		],
	},
	inputs: {
		items: [
			{
				id: "i1",
				text: "Concept document and a paper map of the island",
				artifact: {
					name: "Concept document",
					type: "Document",
					link: "https://example.com/concept",
				},
				match: "Matches",
				note: "A two-page concept with the tide mechanic.",
			},
		],
		before: [
			{
				id: "b1",
				name: "Concept document",
				type: "Document",
				link: "https://example.com/concept",
				addedAt: "2026-08-20T10:00:00.000Z",
			},
		],
	},
	artifacts: [
		{
			id: "a1",
			name: "Island demo 0.1",
			type: "ExecutableBuild",
			link: "https://hollowtide.itch.io/demo",
			addedAt: "2026-09-05T18:40:00.000Z",
			addedBy: "Ivo",
			sprint: 1,
			task: "Playable island demo on itch.io",
			read: {
				match: "Matches",
				text: "An itch.io page with a playable web build of the island.",
				source: {},
			},
		},
	],
	devlogs: [
		{
			id: "d1",
			number: 1,
			publishedAt: "2026-09-06T10:00:00.000Z",
			author: "Marta",
			sprint: 1,
			text: "Week 1: greybox of the island is in. The tide rises every two minutes.",
			media: [
				{
					link: "https://example.com/shot.png",
					text: "The greybox island at high tide.",
					unread: null,
					source: {},
				},
			],
		},
	],
};

const meta: Meta<typeof CuratorJournalDrawer> = {
	title: "Admin/CuratorJournalDrawer",
	component: CuratorJournalDrawer,
	args: { checkpoint, onClose: () => {} },
};

export default meta;

type Story = StoryObj<typeof CuratorJournalDrawer>;

/** Frames 12.11.10–10h (`ZDVkr`, `Sjbqf`, `WQpub`, `DitFG`). */
export const Journal: Story = {
	decorators: [withQueries({ key: KEY, data: VIEW })],
};

export const Empty: Story = {
	decorators: [
		withQueries({
			key: KEY,
			data: {
				...VIEW,
				messages: [],
				finishedAt: null,
				artifacts: [],
				devlogs: [],
				inputs: { items: [], before: [] },
			} satisfies CuratorJournalViewDto,
		}),
	],
};

export const Loading: Story = {
	decorators: [withQueries({ key: KEY, state: "pending" })],
};

export const LoadFailed: Story = {
	decorators: [withQueries({ key: KEY, state: "error" })],
};
