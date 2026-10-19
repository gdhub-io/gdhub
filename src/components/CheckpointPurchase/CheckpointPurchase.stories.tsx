import type { Meta, StoryObj } from "@storybook/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import {
	CheckpointCuratorKind,
	CheckpointStatus,
	SkillLevel,
} from "@/config/prisma-enums";
import type { CheckpointCurator } from "@/repositories/checkpoint-curators";
import type {
	CheckpointDto,
	CheckpointListResponse,
} from "@/types/checkpoints";
import { CheckpointPurchase } from ".";

const SLUG = "lantern-keeper";

const project = {
	id: "p1",
	slug: SLUG,
	name: "Lantern Keeper",
	team: { id: "t1" },
};

const marta: CheckpointCurator = {
	userId: "u-marta",
	specialityId: "s1",
	name: "Marta Ilves",
	image: null,
	role: "Game Designer",
	specialization: "Game design",
	level: SkillLevel.Expert,
	summary: "Shipped three narrative puzzlers.",
	firstCallFrom: "2026-10-21T08:00:00.000Z",
};

const draft: CheckpointDto = {
	id: "cp1",
	projectId: project.id,
	stepId: "step-2",
	stageName: "Ideation",
	order: 1,
	status: CheckpointStatus.Draft,
	goal: "",
	curatorKind: CheckpointCuratorKind.AI,
	curator: null,
	startedAt: null,
	dueAt: null,
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
	paymentId: null,
	createdAt: "2026-10-16T08:00:00.000Z",
	updatedAt: "2026-10-16T08:00:00.000Z",
	items: [],
	day: null,
	daysLeft: null,
};

const goal =
	"A playable greybox of the lantern mechanic that friends can try in 10 minutes.";

/** Seeds every query the page reads, so each state renders without a server. */
const withCheckpoint =
	(checkpoint: CheckpointDto | null) => (Story: () => ReactElement) => {
		const client = new QueryClient({
			defaultOptions: {
				queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
			},
		});
		const list: CheckpointListResponse = {
			current: checkpoint,
			closed: { rows: [], total: 0, page: 1, limit: 10 },
			canCreate: !checkpoint,
			blocker: null,
		};

		client.setQueryData(
			["project-checkpoints", project.id, 1, undefined],
			list,
		);
		client.setQueryData(["user-project-team", "t1"], {
			data: {
				members: [
					{
						id: "m1",
						userId: "u-anna",
						position: "Founder",
						speciality: { name: "Game designer" },
						user: {
							name: "Anna Petrova",
							image: null,
							profile: { timeForWork: [10, 14] },
						},
					},
				],
			},
		});
		client.setQueryData(["checkpoint-curators"], [marta]);
		if (checkpoint)
			client.setQueryData(["checkpoint", checkpoint.id], checkpoint);

		return (
			<QueryClientProvider client={client}>
				<Story />
			</QueryClientProvider>
		);
	};

const at = (step?: string) => ({
	nextjs: {
		appDirectory: true,
		navigation: {
			query: step ? { project: SLUG, step } : { project: SLUG },
		},
	},
});

const meta: Meta<typeof CheckpointPurchase> = {
	title: "Checkpoints/Purchase",
	component: CheckpointPurchase,
	args: { project },
	parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof CheckpointPurchase>;

/** Before anything has come back: the title and facts, the body in skeletons. */
export const Loading: Story = {
	decorators: [
		(Story) => {
			const client = new QueryClient();
			// The list never answers, so the page stays on its skeleton.
			client.setQueryDefaults(["project-checkpoints"], {
				retry: Number.POSITIVE_INFINITY,
				retryDelay: Number.MAX_SAFE_INTEGER,
			});
			return (
				<QueryClientProvider client={client}>
					<Story />
				</QueryClientProvider>
			);
		},
	],
	parameters: at(),
};

/** Frame 12.3 (`mfAfN`): the work resource and the goal, "from $19". */
export const Goal: Story = {
	decorators: [withCheckpoint(draft)],
	parameters: at("goal"),
};

/** Frame 12.4 (`BhCEd`) with the AI curator chosen. */
export const Curator: Story = {
	decorators: [withCheckpoint({ ...draft, goal })],
	parameters: at("curator"),
};

/** Frame 12.5 (`msGNN`): the chosen expert's price on the button. */
export const Payment: Story = {
	decorators: [
		withCheckpoint({
			...draft,
			goal,
			curatorKind: CheckpointCuratorKind.Human,
			curator: { id: marta.userId, name: marta.name, image: null },
			startedAt: "2026-10-21T08:00:00.000Z",
			acceptedTermsAt: "2026-10-16T09:00:00.000Z",
		}),
	],
	parameters: at("payment"),
};

/** Back from Stripe before the webhook landed: settling on its own. */
export const Settling: Story = {
	decorators: [
		withCheckpoint({
			...draft,
			goal,
			startedAt: "2026-10-16T00:00:00.000Z",
			acceptedTermsAt: "2026-10-16T09:00:00.000Z",
		}),
	],
	parameters: at("ready"),
};

/** Frame 12.6 (`hl76Z`): the AI curator runs at once — "$19 paid". */
export const PaidAI: Story = {
	decorators: [
		withCheckpoint({
			...draft,
			goal,
			status: CheckpointStatus.Active,
			startedAt: "2026-10-16T00:00:00.000Z",
			dueAt: "2026-11-12T00:00:00.000Z",
			acceptedTermsAt: "2026-10-16T09:00:00.000Z",
			paymentId: "pay_1",
			heldPrice: 19,
			number: 1,
			day: 1,
			daysLeft: 27,
		}),
	],
	parameters: at("ready"),
};

/** Frame 12.7 (`YgVnb`): a person has to accept — "$450 reserved". */
export const PaidPro: Story = {
	decorators: [
		withCheckpoint({
			...draft,
			goal,
			status: CheckpointStatus.AwaitingCurator,
			curatorKind: CheckpointCuratorKind.Human,
			curator: { id: marta.userId, name: marta.name, image: null },
			startedAt: "2026-10-21T08:00:00.000Z",
			acceptedTermsAt: "2026-10-16T09:00:00.000Z",
			paymentId: "pay_1",
			heldPrice: 450,
			number: 1,
		}),
	],
	parameters: at("ready"),
};
