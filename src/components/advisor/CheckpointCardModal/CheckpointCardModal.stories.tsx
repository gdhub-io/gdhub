import type { Meta, StoryObj } from "@storybook/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import {
	ArtifactCheckStatus,
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
	ProjectArtifactType,
} from "@/config/prisma-enums";
import type {
	AdvisorCheckpointDto,
	AdvisorProjectDto,
	CheckpointItemDto,
	CheckpointPulseCellDto,
	CheckpointSprintDto,
} from "@/types/checkpoints";
import { CheckpointCardModal } from ".";

const item = (
	id: string,
	kind: CheckpointItemKind,
	text: string,
	proven = false,
): CheckpointItemDto =>
	({
		id,
		kind,
		order: 0,
		text,
		originalText: null,
		cut: false,
		addedAt: null,
		note: null,
		acceptedNote: null,
		artifact: proven
			? {
					id: `art-${id}`,
					name: "Tidewalker — build 0.4",
					type: ProjectArtifactType.ExecutableBuild,
					link: "https://example.com/build.zip",
					checkStatus: ArtifactCheckStatus.Readable,
				}
			: null,
	}) as CheckpointItemDto;

const CHECKPOINT = {
	id: "cp1",
	projectId: "p1",
	stepId: "step-3",
	stageName: "Prototyping",
	order: 3,
	status: CheckpointStatus.AwaitingCurator,
	goal: "Ship a playable prototype of the tide mechanic that a stranger can finish in 15 minutes without help.",
	curatorKind: CheckpointCuratorKind.Human,
	curator: null,
	startedAt: "2026-09-28T00:00:00.000Z",
	dueAt: "2026-10-25T00:00:00.000Z",
	goalAgreedAt: null,
	revisedAt: null,
	revisedNote: null,
	midNote: null,
	summary: null,
	verdict: null,
	verdictNote: null,
	decidedAt: null,
	acceptedTermsAt: "2026-09-18T00:00:00.000Z",
	curatorDeclinedAt: null,
	declinedCuratorIds: [],
	paymentId: "pay1",
	createdAt: "2026-09-18T00:00:00.000Z",
	updatedAt: "2026-09-18T00:00:00.000Z",
	day: null,
	daysLeft: null,
	items: [
		item(
			"i1",
			CheckpointItemKind.Input,
			"A Unity project running the tide sim at 30 fps",
			true,
		),
		item(
			"i2",
			CheckpointItemKind.Input,
			"A paper prototype played by six people",
		),
		item(
			"o1",
			CheckpointItemKind.Outcome,
			"A 15-minute build a stranger can finish without help",
		),
		item(
			"o2",
			CheckpointItemKind.Outcome,
			"Three tide states with art, not placeholders",
		),
	],
	project: { name: "Hollow Tide", slug: "hollow-tide" },
} as AdvisorCheckpointDto;

/** Four weeks from 28 Sep; the second is the one running. */
const SPRINTS: CheckpointSprintDto[] = [
	["09-28", "10-04", "done"],
	["10-05", "10-11", "current"],
	["10-12", "10-18", "ahead"],
	["10-19", "10-25", "ahead"],
].map(([from, to, state], index) => ({
	number: index + 1,
	from: `2026-${from}T00:00:00.000Z`,
	to: `2026-${to}T00:00:00.000Z`,
	firstDay: index * 7 + 1,
	lastDay: (index + 1) * 7,
	devlogDay: (index + 1) * 7,
	state: state as CheckpointSprintDto["state"],
}));

const pulse = (
	...states: CheckpointPulseCellDto["state"][]
): CheckpointPulseCellDto[] =>
	states.map((state, index) => ({
		sprint: index + 1,
		state,
		confirmedAt: state === "confirmed" ? "2026-10-02T00:00:00.000Z" : null,
		source: state === "confirmed" ? "app" : null,
	}));

const PROJECT: AdvisorProjectDto = {
	name: "Hollow Tide",
	description:
		"A puzzle adventure where the sea rises and falls with every move you make.",
	coverImage: null,
	videoLink: null,
	startedAt: "2026-01-10T00:00:00.000Z",
	updatedAt: "2026-09-20T00:00:00.000Z",
	details: {
		genre: "Puzzle adventure",
		platform: "PC",
		setting: "A drowned coastal town",
		visualStyle: "Hand-painted 2D",
		audition: null,
	},
	links: [{ platform: "steam", link: "https://store.steampowered.com" }],
	stage: "Prototyping",
	capacity: {
		members: 3,
		stated: 2,
		hoursPerWeek: { from: 30, to: 40 },
		hoursPerRun: { from: 120, to: 160 },
	},
	team: [
		{
			id: "m1",
			position: "Lead designer",
			speciality: { name: "Game design", level: "Expert" },
			isFounder: true,
			hoursPerWeek: [20, 25],
			startedAt: "2026-01-10T00:00:00.000Z",
			pulse: pulse("confirmed", "waiting", "notAsked", "notAsked"),
		},
		{
			id: "m2",
			position: "Programmer",
			speciality: { name: "Gameplay programming", level: "Middle" },
			isFounder: false,
			hoursPerWeek: [10, 15],
			startedAt: "2026-04-02T00:00:00.000Z",
			pulse: pulse("missed", "confirmed", "notAsked", "notAsked"),
		},
		{
			id: "m3",
			position: "Artist",
			speciality: null,
			isFounder: false,
			hoursPerWeek: null,
			startedAt: "2026-07-15T00:00:00.000Z",
			pulse: pulse("confirmed", "waiting", "notAsked", "notAsked"),
		},
	],
	sprints: SPRINTS,
	latestDevlogs: [
		{
			id: "l1",
			publishedAt: "2026-09-20T12:00:00.000Z",
			content:
				"Prototyping wrapped: the tide rises on every move, and the paper version finally plays the way the pitch reads.",
		},
		{
			id: "l2",
			publishedAt: "2026-09-06T12:00:00.000Z",
			content: "Six strangers played the paper prototype. Four finished.",
		},
	],
	devlogs: [
		{
			id: "d1",
			publishedAt: "2026-10-04T12:00:00.000Z",
			content:
				"Week one: the tide sim now runs off a single state machine, and the first stranger playtest finished in 22 minutes.\n\nNext: cut the tutorial in half.",
			curatorFeedback:
				"Good first week. Watch the 22 minutes — the goal is 15, and the tutorial is the obvious place to find them.",
			sprint: 1,
		},
	],
};

/** The card reads the project through TanStack Query; the story seeds its key. */
function withProject(project?: AdvisorProjectDto) {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
		},
	});

	if (project) client.setQueryData(["advisor-project", CHECKPOINT.id], project);

	return (Story: () => ReactElement) => (
		<QueryClientProvider client={client}>
			<Story />
		</QueryClientProvider>
	);
}

const meta: Meta<typeof CheckpointCardModal> = {
	title: "Advisor/CheckpointCardModal",
	component: CheckpointCardModal,
	parameters: { layout: "fullscreen" },
	args: { checkpoint: CHECKPOINT, open: true, onClose: () => {} },
};

export default meta;

type Story = StoryObj<typeof CheckpointCardModal>;

/** Waiting on this curator: the answer sits in the header, and no pulse yet. */
export const Request: Story = {
	decorators: [
		withProject({
			...PROJECT,
			sprints: [],
			devlogs: [],
			team: PROJECT.team.map((member) => ({ ...member, pulse: [] })),
		}),
	],
	args: { answerable: true },
};

/** Already theirs: read-only, with the team's weekly pulse and devlogs. */
export const Running: Story = {
	decorators: [withProject(PROJECT)],
	args: { checkpoint: { ...CHECKPOINT, status: CheckpointStatus.Active } },
};

export const Loading: Story = { decorators: [withProject()] };

/** Nothing written, nobody stated hours, no media. */
export const Sparse: Story = {
	decorators: [
		withProject({
			...PROJECT,
			description: null,
			details: {
				genre: null,
				platform: null,
				setting: null,
				visualStyle: null,
				audition: null,
			},
			links: [],
			stage: null,
			sprints: [],
			latestDevlogs: [],
			devlogs: [],
			capacity: {
				members: 1,
				stated: 0,
				hoursPerWeek: null,
				hoursPerRun: null,
			},
			team: [{ ...PROJECT.team[2], pulse: [] }],
		}),
	],
	args: {
		checkpoint: { ...CHECKPOINT, goal: "", items: [] },
		answerable: true,
	},
};
