import type { Meta, StoryObj } from "@storybook/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { CheckpointVerdict, SkillLevel } from "@/config/prisma-enums";
import type { CardCheckpoint } from "../types";
import { CheckpointsTab } from "./CheckpointsTab";

const read = (
	value: CardCheckpoint["directions"][number]["goal"]["value"],
) => ({
	value,
	why: `The curator's reason for “${value}”.`,
});

const HISTORY: CardCheckpoint[] = [
	{
		id: "cp4",
		number: 4,
		stage: "Prototyping",
		goal: "A playable greybox of the first island: walk from the beach to the lighthouse.",
		running: true,
		startedAt: "2025-10-20",
		dueAt: "2025-11-16",
		day: 15,
		verdict: null,
		verdictNote: null,
		curator: null,
		directions: [],
	},
	{
		id: "cp2",
		number: 2,
		stage: "Concepting",
		goal: "A one-page pitch and a mood board the whole team agrees on.",
		running: false,
		startedAt: "2025-08-11",
		dueAt: "2025-09-07",
		day: null,
		verdict: CheckpointVerdict.GoalMissed,
		verdictNote:
			"The pitch one-pager shows the pitch in full. I accepted the mood board on trust: it is behind a login and I could not check it. The pitch video shows a different game, so the goal is missed.",
		curator: null,
		directions: [
			{ sprint: 1, goal: read("toward"), stage: read("sideways") },
			{ sprint: 2, goal: read("toward"), stage: read("toward") },
			{ sprint: 3, goal: read("stalled"), stage: read("toward") },
			{ sprint: 4, goal: read("toward"), stage: read("idle") },
		],
	},
	{
		id: "cp1",
		number: 1,
		stage: "Ideation",
		goal: "The core idea, the audience and three reference games, agreed by the team.",
		running: false,
		startedAt: "2025-06-02",
		dueAt: "2025-06-29",
		day: null,
		verdict: CheckpointVerdict.StageClosed,
		verdictNote: "The idea, the audience and the references are all there.",
		curator: {
			name: "Marta Kowalska",
			image: null,
			speciality: {
				id: "sp1",
				name: "Game Designer",
				level: SkillLevel.Experienced,
			},
		},
		directions: [],
	},
];

/** The tab reads its section through TanStack Query; the story seeds its key. */
function withHistory(history?: CardCheckpoint[]) {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
		},
	});
	if (history)
		client.setQueryData(["scout", "games", "p1", "checkpoints", null], history);

	return (Story: () => ReactElement) => (
		<QueryClientProvider client={client}>
			<Story />
		</QueryClientProvider>
	);
}

const meta: Meta<typeof CheckpointsTab> = {
	title: "Scout/ProjectCardModal/CheckpointsTab",
	component: CheckpointsTab,
	args: { projectId: "p1" },
};

export default meta;

type Story = StoryObj<typeof CheckpointsTab>;

/** Frame 09.07.7: running on top, a missed goal with its directions, a person's verdict below. */
export const History: Story = { decorators: [withHistory(HISTORY)] };

/** Frame 09.07.8. */
export const Empty: Story = { decorators: [withHistory([])] };

export const Loading: Story = { decorators: [withHistory()] };
