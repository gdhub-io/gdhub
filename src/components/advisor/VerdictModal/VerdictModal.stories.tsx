import type { Meta, StoryObj } from "@storybook/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "antd";
import type { ReactElement } from "react";
import {
	ArtifactCheckStatus,
	CheckpointCuratorKind,
	CheckpointItemKind,
	CheckpointStatus,
	CheckpointVerdict,
	ProjectArtifactType,
} from "@/config/prisma-enums";
import type {
	AdvisorCheckpointDto,
	AdvisorProjectDto,
	CheckpointItemDto,
	CheckpointPulseCellDto,
	VerdictContextDto,
} from "@/types/checkpoints";
import { VerdictModal } from ".";

/** Dates hang off today, so the stage each story shows does not age. */
const day = (offset: number, hour = 0) => {
	const date = new Date();
	date.setUTCHours(hour, 0, 0, 0);
	date.setUTCDate(date.getUTCDate() + offset);

	return date.toISOString();
};

const artifact = (name: string, readable = true) => ({
	id: `art-${name}`,
	name,
	type: ProjectArtifactType.ExecutableBuild,
	link: `https://example.com/${name}`,
	checkStatus: readable
		? ArtifactCheckStatus.Readable
		: ArtifactCheckStatus.Pending,
});

const item = (
	id: string,
	kind: CheckpointItemKind,
	text: string,
	extra: Partial<CheckpointItemDto> = {},
): CheckpointItemDto => ({
	id,
	kind,
	order: Number(id.slice(1)),
	text,
	originalText: null,
	cut: false,
	addedAt: null,
	note: null,
	acceptedNote: null,
	artifact: null,
	...extra,
});

const checkpoint = (started: number): AdvisorCheckpointDto => ({
	id: "cp1",
	projectId: "p1",
	stepId: "step-3",
	stageName: "Prototyping",
	order: 2,
	number: 2,
	status: CheckpointStatus.Active,
	goal: "Ship a playable prototype of the tide mechanic that a stranger can finish in 15 minutes without help.",
	curatorKind: CheckpointCuratorKind.Human,
	curator: null,
	startedAt: day(started),
	dueAt: day(started + 27),
	goalAgreedAt: null,
	revisedAt: null,
	revisedNote: null,
	midNote: null,
	summary: null,
	verdict: null,
	verdictNote: null,
	decidedAt: null,
	acceptedTermsAt: null,
	curatorAcceptedAt: null,
	curatorDeclinedAt: null,
	declinedCuratorIds: [],
	paymentId: "pay1",
	createdAt: day(started - 7),
	updatedAt: day(-1),
	day: null,
	daysLeft: null,
	items: [
		item(
			"i1",
			CheckpointItemKind.Input,
			"A paper prototype played by six people outside the team",
			{ artifact: artifact("paper-playtest-notes.pdf") },
		),
		item("i2", CheckpointItemKind.Input, "One environment key, signed off"),
		item(
			"o1",
			CheckpointItemKind.Outcome,
			"A 15-minute build a stranger can finish without help",
			{ artifact: artifact("build-0.4.zip") },
		),
		item(
			"o2",
			CheckpointItemKind.Outcome,
			"Three tide states with art, not placeholders",
			{ artifact: artifact("tide-states.mp4") },
		),
		item(
			"o3",
			CheckpointItemKind.Outcome,
			"A save system that survives a crash",
			{ artifact: artifact("save-crash-test.mp4", false) },
		),
		item("o4", CheckpointItemKind.Outcome, "A trailer cut from the prototype", {
			cut: true,
		}),
	],
	project: { name: "Hollow Tide", slug: "hollow-tide" },
});

const pulse = (
	...states: CheckpointPulseCellDto["state"][]
): CheckpointPulseCellDto[] =>
	states.map((state, index) => ({
		sprint: index + 1,
		state,
		confirmedAt: state === "confirmed" ? day(-20 + index * 7) : null,
		source: state === "confirmed" ? "app" : null,
	}));

const seat = (
	id: string,
	position: string | null,
	speciality: string,
	cells: CheckpointPulseCellDto[],
): AdvisorProjectDto["team"][number] => ({
	id,
	position,
	speciality: { name: speciality, level: "Middle" },
	isFounder: id === "m1",
	hoursPerWeek: [10, 20],
	startedAt: day(-200),
	pulse: cells,
});

const PROJECT: AdvisorProjectDto = {
	name: "Hollow Tide",
	description: null,
	coverImage: null,
	videoLink: null,
	startedAt: day(-300),
	updatedAt: day(-1),
	details: {
		genre: "Puzzle adventure",
		platform: "PC",
		setting: null,
		visualStyle: null,
		audition: null,
	},
	links: [],
	stage: "Prototyping",
	capacity: {
		members: 4,
		stated: 4,
		hoursPerWeek: { from: 40, to: 80 },
		hoursPerRun: { from: 160, to: 320 },
	},
	team: [
		seat(
			"m1",
			"Lead designer",
			"Game design",
			pulse("confirmed", "confirmed", "confirmed", "confirmed"),
		),
		seat(
			"m2",
			"Programmer",
			"Gameplay programming",
			pulse("confirmed", "missed", "confirmed", "confirmed"),
		),
		seat("m3", null, "2D art", pulse("missed", "missed", "missed", "waiting")),
		seat(
			"m4",
			"Sound designer",
			"Music & sound",
			pulse("notOnTeam", "confirmed", "confirmed", "confirmed"),
		),
	],
	sprints: [],
	latestDevlogs: [],
	devlogs: [
		["Two strangers finished it, 14 and 17 minutes", 4, -2],
		["Save bug found: it was the autosave timer", 3, -9],
		["Art for state one, and a save bug we cannot reproduce", 2, -16],
		["Tide states, blocked out in grey", 1, -23],
	].map(([content, sprint, offset], index) => ({
		id: `d${index}`,
		content: `${content}\n\nThe rest of the post.`,
		sprint: sprint as number,
		publishedAt: day(offset as number, 12),
	})),
};

const context = (
	started: number,
	overrides: Partial<VerdictContextDto>,
): VerdictContextDto => ({
	stage: "send",
	dueAt: day(started + 27),
	draft: null,
	finalCall: { scheduledAt: day(started + 28, 10), curatorJoinedAt: null },
	currentStage: { name: "Prototyping", key: null },
	nextStage: {
		name: "Preparing a demo version",
		key: "workflow.story.step4.name",
	},
	lastBuild: {
		name: "Hollow Tide v0.4 · Windows, macOS",
		link: "https://hollowtide.itch.io/prototype",
		domain: "itch.io",
		createdAt: day(started + 26, 15),
	},
	...overrides,
});

/** The modal reads two queries; the story seeds both keys. */
function withData(verdict?: VerdictContextDto, project = PROJECT) {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
		},
	});

	if (verdict) {
		client.setQueryData(["verdict-context", "cp1"], verdict);
		client.setQueryData(["advisor-project", "cp1"], project);
	}

	return (Story: () => ReactElement) => (
		<QueryClientProvider client={client}>
			<App>
				<Story />
			</App>
		</QueryClientProvider>
	);
}

const meta: Meta<typeof VerdictModal> = {
	title: "Advisor/VerdictModal",
	component: VerdictModal,
	parameters: { layout: "fullscreen" },
	args: { open: true, onClose: () => {} },
};

export default meta;

type Story = StoryObj<typeof VerdictModal>;

/** The final call has started: the verdict can be sent, once. */
export const Send: Story = {
	decorators: [
		withData(
			context(-28, {
				draft: {
					verdict: CheckpointVerdict.StageClosed,
					note: "The outcome list is done bar the trailer, which you cut after call 3 with a reason I agree with.",
					savedAt: day(-2, 18),
				},
			}),
		),
	],
	args: { checkpoint: checkpoint(-28) },
};

/** Sprint 4, before the final call: a draft only the curator sees. */
export const Draft: Story = {
	decorators: [
		withData(
			context(-24, {
				stage: "draft",
				draft: {
					verdict: CheckpointVerdict.GoalMet,
					note: "Three of four outcomes are proven so far.",
					savedAt: day(-1, 18),
				},
			}),
		),
	],
	args: { checkpoint: checkpoint(-24) },
};

/** Nothing saved yet, on the workflow's last stage, and no build uploaded. */
export const DraftEmpty: Story = {
	decorators: [
		withData(
			context(-22, { stage: "draft", nextStage: null, lastBuild: null }),
			{ ...PROJECT, devlogs: [] },
		),
	],
	args: { checkpoint: checkpoint(-22) },
};

/** Before sprint 4: the evidence can be read, nothing can be written. */
export const Early: Story = {
	decorators: [withData(context(-10, { stage: "early" }))],
	args: { checkpoint: checkpoint(-10) },
};

export const Loading: Story = {
	decorators: [withData()],
	args: { checkpoint: checkpoint(-28) },
};
