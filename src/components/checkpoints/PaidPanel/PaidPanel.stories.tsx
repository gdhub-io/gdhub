import type { Meta, StoryObj } from "@storybook/nextjs";
import { CheckpointCuratorKind, CheckpointStatus } from "@/config/prisma-enums";
import type { CheckpointDto } from "@/types/checkpoints";
import { PaidPanel } from ".";

const paid: CheckpointDto = {
	id: "cp1",
	projectId: "p1",
	stepId: "step-2",
	stageName: "Ideation",
	order: 1,
	number: 1,
	status: CheckpointStatus.Active,
	goal: "A playable greybox of the lantern mechanic.",
	curatorKind: CheckpointCuratorKind.AI,
	curator: null,
	startedAt: "2026-10-16T00:00:00.000Z",
	dueAt: "2026-11-12T00:00:00.000Z",
	goalAgreedAt: null,
	revisedAt: null,
	revisedNote: null,
	midNote: null,
	summary: null,
	verdict: null,
	verdictNote: null,
	decidedAt: null,
	acceptedTermsAt: "2026-10-16T09:00:00.000Z",
	curatorAcceptedAt: null,
	curatorDeclinedAt: null,
	declinedCuratorIds: [],
	paymentId: "pay_1",
	heldPrice: 19,
	createdAt: "2026-10-16T08:00:00.000Z",
	updatedAt: "2026-10-16T09:00:00.000Z",
	items: [],
	day: 1,
	daysLeft: 27,
	upcoming: false,
};

const human: CheckpointDto = {
	...paid,
	status: CheckpointStatus.AwaitingCurator,
	curatorKind: CheckpointCuratorKind.Human,
	curator: { id: "u-marta", name: "Marta Ilves", image: null },
	startedAt: "2026-10-21T08:00:00.000Z",
	heldPrice: 450,
	day: null,
	daysLeft: null,
};

const meta: Meta<typeof PaidPanel> = {
	title: "Checkpoints/PaidPanel",
	component: PaidPanel,
	args: {
		exitHref: "/user/project/lantern-keeper/workflow",
		projectHref: "/user/project/lantern-keeper/settings",
	},
};
export default meta;

type Story = StoryObj<typeof PaidPanel>;

/** Frame 12.6 (`hl76Z`): the AI curator, day 1 today. */
export const AICurator: Story = { args: { checkpoint: paid } };

/** The AI curator with day 1 picked for later: the line names the date, not "Day 1 of 28". */
export const AICuratorLater: Story = {
	args: {
		checkpoint: {
			...paid,
			startedAt: "2099-01-05T00:00:00.000Z",
			dueAt: "2099-02-01T00:00:00.000Z",
			upcoming: true,
		},
	},
};

/** Frame 12.7 (`YgVnb`): a person has to accept; the money is held. */
export const ProCurator: Story = { args: { checkpoint: human } };

/** Back from Stripe, the webhook not landed yet. */
export const Settling: Story = {
	args: {
		checkpoint: {
			...paid,
			status: CheckpointStatus.Draft,
			paymentId: null,
			day: null,
			daysLeft: null,
		},
	},
};

/** The curator handed it back and the hold was let go. */
export const Declined: Story = {
	args: {
		checkpoint: {
			...human,
			status: CheckpointStatus.Draft,
			curator: null,
			curatorDeclinedAt: "2026-10-18T09:00:00.000Z",
			declinedCuratorIds: ["u-marta"],
			paymentId: null,
		},
	},
};
