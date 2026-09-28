import type { Meta, StoryObj } from "@storybook/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Card, Skeleton } from "antd";
import type { ReactElement } from "react";
import { AccessProvider } from "@/components/access/AccessProvider";
import { CheckpointCuratorKind, CheckpointStatus } from "@/config/prisma-enums";
import type { CheckpointDto } from "@/types/checkpoints";
import { CheckpointWidgetView } from ".";

const PROJECT_ID = "p1";

const base: CheckpointDto = {
	id: "cp1",
	projectId: PROJECT_ID,
	stepId: "step-3",
	stageName: "Prototyping",
	order: 3,
	status: CheckpointStatus.Active,
	goal: "A playable prototype a stranger can finish in 15 minutes.",
	curatorKind: CheckpointCuratorKind.Human,
	curator: { id: "u9", name: "Mira Ivanova", image: null },
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
	acceptedTermsAt: "2026-09-20T00:00:00.000Z",
	curatorDeclinedAt: null,
	declinedCuratorIds: [],
	paymentId: "pay1",
	createdAt: "2026-09-20T00:00:00.000Z",
	updatedAt: "2026-09-28T00:00:00.000Z",
	items: [],
	day: 9,
	daysLeft: 19,
	next: { kind: "devlog", sprint: 2, day: 13, overdue: false },
};

/** The start button reads the list and the permission; both are seeded here. */
function withProject(Story: () => ReactElement) {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
		},
	});

	client.setQueryData(["project-checkpoints", PROJECT_ID, 1], {
		current: null,
		closed: { rows: [], total: 0, page: 1, limit: 10 },
		canCreate: true,
		blocker: null,
	});

	return (
		<QueryClientProvider client={client}>
			<AccessProvider
				value={{
					project: {
						role: "owner",
						permissions: [
							"project.checkpoints.view",
							"project.checkpoints.create",
						],
						scopes: {},
					} as never,
				}}
			>
				<div style={{ width: 380 }}>
					<Story />
				</div>
			</AccessProvider>
		</QueryClientProvider>
	);
}

const meta: Meta<typeof CheckpointWidgetView> = {
	title: "Checkpoints/CheckpointWidget",
	component: CheckpointWidgetView,
	decorators: [withProject],
	args: { projectId: PROJECT_ID, projectSlug: "hollow-tide", checkpoint: base },
};

export default meta;

type Story = StoryObj<typeof CheckpointWidgetView>;

/** `kSXbn` */
export const None: Story = { args: { checkpoint: null } };

/** `jnZ3d` */
export const Draft: Story = {
	args: {
		checkpoint: {
			...base,
			status: CheckpointStatus.Draft,
			day: null,
			next: null,
		},
	},
};

/** `l3dPO` */
export const WaitingForCurator: Story = {
	args: {
		checkpoint: {
			...base,
			status: CheckpointStatus.AwaitingCurator,
			day: null,
			next: null,
		},
	},
};

/** `TfVJG` — the devlog it owes is a task in the list below, not here. */
export const Active: Story = {};

/** `oDDJm` */
export const ActiveCall: Story = {
	args: {
		checkpoint: {
			...base,
			day: 14,
			next: { kind: "call", call: 3, day: 15 },
		},
	},
};

/** `OKro2` */
export const AwaitingVerdict: Story = {
	args: {
		checkpoint: {
			...base,
			status: CheckpointStatus.Review,
			day: 28,
			next: { kind: "verdict", day: 30 },
		},
	},
};

/** `YOhx7` — what the fetching wrapper shows while the list loads. */
export const Loading: Story = {
	render: () => (
		<Card>
			<Skeleton active avatar={{ shape: "square" }} paragraph={{ rows: 1 }} />
		</Card>
	),
};
