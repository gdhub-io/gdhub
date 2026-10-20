import type { Meta, StoryObj } from "@storybook/nextjs";
import { CheckpointCuratorKind } from "@/config/prisma-enums";
import type { CheckpointRefundQuote } from "@/repositories/checkpoint-refund";
import { withQueries } from "../storyQueries";
import { RefundCheckpointModal } from ".";

const KEY = ["admin", "checkpoints", "refund", "cp1"];
const paidAt = new Date(Date.now() - 11 * 24 * 3600 * 1000).toISOString();

const QUOTE: CheckpointRefundQuote = {
	paid: 45000,
	paidAt,
	withdrawalEndsAt: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
	refunded: null,
	curatorKind: CheckpointCuratorKind.Human,
	verdictSent: false,
	parts: 6,
	provided: 2,
	part: 7500,
	refund: 30000,
	reasons: [
		{ reason: "withdrawal", refused: null },
		{ reason: "curatorGone", refused: null },
		{ reason: "noVerdict", refused: "verdictNotOverdue" },
	],
};

const meta: Meta<typeof RefundCheckpointModal> = {
	title: "Admin/RefundCheckpointModal",
	component: RefundCheckpointModal,
	args: {
		checkpoint: { id: "cp1", number: 2, projectName: "Hollow Tide" },
		onClose: () => {},
	},
};

export default meta;

type Story = StoryObj<typeof RefundCheckpointModal>;

/** Frame 11.6 (`zkz19`); pick a reason to see the sum. */
export const Open: Story = {
	decorators: [withQueries({ key: KEY, data: QUOTE })],
};

/** Frame 11.6b (`mFHVH`). */
export const WithdrawalOver: Story = {
	decorators: [
		withQueries({
			key: KEY,
			data: {
				...QUOTE,
				reasons: QUOTE.reasons.map((row) =>
					row.reason === "withdrawal"
						? { ...row, refused: "withdrawalOver" }
						: row,
				),
			},
		}),
	],
};

/** Frame 11.6c (`v512S`). */
export const AlreadyRefunded: Story = {
	decorators: [
		withQueries({
			key: KEY,
			data: {
				...QUOTE,
				refunded: {
					amount: 30000,
					reason: "withdrawal",
					at: new Date().toISOString(),
				},
			},
		}),
	],
};

/** The AI curator: four parts of $5. */
export const AiCurator: Story = {
	decorators: [
		withQueries({
			key: KEY,
			data: {
				...QUOTE,
				curatorKind: CheckpointCuratorKind.AI,
				paid: 2000,
				parts: 4,
				provided: 1,
				part: 500,
				refund: 1500,
			},
		}),
	],
};

export const Loading: Story = {
	decorators: [withQueries({ key: KEY, state: "pending" })],
};
