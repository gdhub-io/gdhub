import type { Meta, StoryObj } from "@storybook/nextjs";
import { AdviceRequestStatus } from "@/config/prisma-enums";
import type { AdvisorRequest } from "@/repositories/advisor.requests";
import { AdviceRequestCard } from "./index";

const request: AdvisorRequest = {
	id: "req-1",
	status: AdviceRequestStatus.Created,
	askedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
	topic: "How do we price a premium DLC for a 12k-wishlist game?",
	question:
		"We are 3 months from launch and the publisher pushes for a season pass instead of one paid DLC. Our wishlist is 12k with 60% from one streamer spike.",
	matrixRoomId: null,
	asker: {
		id: "user-1",
		name: "Anna Volkova",
		image: null,
		role: "Producer",
		direction: "management",
		specialityId: "spec-1",
	},
	project: {
		id: "project-1",
		slug: "hollow-tide",
		name: "Hollow Tide",
		stage: "Vertical slice",
	},
};

const noop = () => undefined;

const meta: Meta<typeof AdviceRequestCard> = {
	title: "Advisor/AdviceRequestCard",
	component: AdviceRequestCard,
	parameters: { layout: "padded" },
	args: {
		request,
		askedIn: "Publishing & monetization",
		onShowDetails: noop,
		onDecline: noop,
		onMarkDone: noop,
		onOpenChat: noop,
	},
};

export default meta;

type Story = StoryObj<typeof AdviceRequestCard>;

/** Nothing has happened yet: the pair of actions is decline or open it. */
export const New: Story = {};

/** Accepted, so the chat exists and the only thing left is to finish it. */
export const InProgress: Story = {
	args: {
		request: {
			...request,
			status: AdviceRequestStatus.Approved,
			matrixRoomId: "!room:gdhub.io",
		},
	},
};

export const Answered: Story = {
	args: { request: { ...request, status: AdviceRequestStatus.Executed } },
};

export const Declined: Story = {
	args: { request: { ...request, status: AdviceRequestStatus.Rejected } },
};

/**
 * A Telegram asker with no account and no project: no role, no craft colour,
 * no project line — the card has to hold together on the least it can be given.
 */
export const FromOutside: Story = {
	args: {
		request: {
			...request,
			topic: "Can I show my build at the next stream?",
			question: null,
			asker: {
				id: null,
				name: "@marat_dev",
				image: null,
				role: null,
				direction: null,
				specialityId: null,
			},
			project: null,
		},
		askedIn: null,
	},
};

/** A question long enough to prove the title and the preview both truncate. */
export const Overflowing: Story = {
	args: {
		request: {
			...request,
			topic:
				"We are rebuilding the onboarding for the third time and I would like to understand whether the retention drop is the tutorial or the store page",
			question:
				"Tutorial is 8 minutes, D1 is fine, D2 falls to 19%. We changed the first mission twice, moved the save point, cut two dialogue screens and the number barely moved, so I suspect the problem starts before the game does.",
		},
	},
};
