import type { Meta, StoryObj } from "@storybook/nextjs";
import {
	CheckpointCuratorKind,
	CheckpointFeeReason,
	CheckpointStatus,
	CheckpointVerdict,
} from "@/config/prisma-enums";
import { withQueries } from "@/mocks/queries";
import type {
	AdminCheckpointRowDto,
	AdminCheckpointsPageDto,
} from "@/types/checkpoints";
import { CheckpointsTable } from ".";

const KEY = ["admin", "checkpoints", "list", { page: 1 }];

const row = (over: Partial<AdminCheckpointRowDto>): AdminCheckpointRowDto => ({
	id: "cp1",
	number: 2,
	stageName: "Prototyping",
	status: CheckpointStatus.Active,
	curatorKind: CheckpointCuratorKind.Human,
	curatorName: "Marta Ilves",
	projectName: "Hollow Tide",
	startedAt: "2026-10-12T00:00:00.000Z",
	dueAt: "2026-11-08T00:00:00.000Z",
	paid: 45000,
	refunded: null,
	refundReason: null,
	verdictDueBy: "2026-11-11T00:00:00.000Z",
	verdict: null,
	overdue: false,
	canRefund: true,
	canAssign: true,
	canDelete: false,
	fee: null,
	noFee: null,
	calls: {
		personMinutes: 0,
		minutes: 0,
		video: 0,
		recording: 0,
		transcript: 0,
		total: 0,
	},
	aiCost: 0,
	margin: null,
	rating: null,
	...over,
});

/** Two people on 200 minutes of calls: $3.46 with recording and transcript. */
const CALLS = {
	personMinutes: 400,
	minutes: 200,
	video: 160,
	recording: 100,
	transcript: 86,
	total: 346,
};

const TOTALS_ZERO = {
	paid: 0,
	refunded: 0,
	net: 0,
	fees: 0,
	calls: 0,
	aiCost: 0,
	margin: 0,
	aiRated: 0,
	aiRatedLow: 0,
	ai: 0,
	human: 0,
};

const PAGE: AdminCheckpointsPageDto = {
	total: 8,
	pageSize: 20,
	stages: ["Ideation", "Prototyping"],
	totals: {
		paid: 173000,
		refunded: 30000,
		net: 143000,
		fees: 49350,
		calls: 1534.6,
		aiCost: 382.4,
		margin: 23812,
		aiRated: 1,
		aiRatedLow: 1,
		ai: 2,
		human: 6,
	},
	items: [
		// Running: no margin yet, the costs so far under the dash.
		row({
			calls: { ...CALLS, personMinutes: 270, video: 108, total: 233 },
			aiCost: 38,
		}),
		row({
			id: "cp2",
			projectName: "Ember Road",
			number: 1,
			stageName: "Ideation",
			curatorKind: CheckpointCuratorKind.AI,
			curatorName: null,
			status: CheckpointStatus.Review,
			paid: 2000,
			aiCost: 84,
		}),
		// Given for free: the menu offers "Delete checkpoint".
		row({
			id: "cp9",
			projectName: "Lantern Field",
			number: 1,
			stageName: "Ideation",
			curatorKind: CheckpointCuratorKind.AI,
			curatorName: null,
			paid: null,
			canRefund: false,
			canAssign: false,
			canDelete: true,
		}),
		row({
			id: "cp3",
			projectName: "Saltmarsh",
			status: CheckpointStatus.AwaitingCurator,
			startedAt: null,
			dueAt: null,
			paid: 36000,
			canRefund: false,
		}),
		row({
			id: "cp4",
			projectName: "Paper Moons",
			status: CheckpointStatus.Cancelled,
			paid: 45000,
			refunded: 30000,
			refundReason: "withdrawal",
			canRefund: false,
			canAssign: false,
			fee: {
				amount: 10500,
				reason: CheckpointFeeReason.RefundReduced,
				parts: 6,
			},
			calls: { ...CALLS, total: 156, video: 64, recording: 50, transcript: 42 },
			aiCost: 31,
			margin: 4313,
		}),
		row({
			id: "cp5",
			projectName: "Quiet Orbit",
			number: 4,
			stageName: "Launch prep",
			status: CheckpointStatus.Closed,
			verdict: CheckpointVerdict.StageClosed,
			canRefund: false,
			canAssign: false,
			fee: { amount: 31500, reason: CheckpointFeeReason.Full, parts: 6 },
			calls: CALLS,
			aiCost: 42,
			margin: 13112,
			// Rated, no comment: the star and the number only.
			rating: {
				rating: 4,
				comment: null,
				createdAt: "2026-10-09T14:20:00.000Z",
			},
		}),
		row({
			id: "cp6",
			projectName: "Copper Bells",
			number: 2,
			stageName: "Prototyping",
			curatorName: "Lea Novak",
			status: CheckpointStatus.Closed,
			canRefund: false,
			canAssign: false,
			// Took over after two calls: the replacement's 4 of 6 parts only.
			fee: { amount: 21000, reason: CheckpointFeeReason.Replacement, parts: 4 },
			calls: CALLS,
			aiCost: 47,
			margin: 23607,
		}),
		row({
			id: "cp7",
			projectName: "Driftwood Bay",
			number: 3,
			status: CheckpointStatus.Closed,
			canRefund: false,
			canAssign: false,
			noFee: "adminVerdict",
			calls: CALLS,
			aiCost: 29,
			margin: 44625,
		}),
		row({
			id: "cp8",
			projectName: "Driftwood",
			number: 1,
			stageName: "Ideation",
			curatorKind: CheckpointCuratorKind.AI,
			curatorName: null,
			status: CheckpointStatus.Closed,
			paid: 2000,
			canRefund: false,
			canAssign: false,
			aiCost: 120,
			margin: 1880,
			rating: {
				rating: 2,
				comment:
					"It ignored the build we attached and judged the concept from the pitch alone.",
				createdAt: "2026-10-13T09:05:00.000Z",
			},
		}),
	],
};

const meta: Meta<typeof CheckpointsTable> = {
	title: "Admin/CheckpointsTable",
	component: CheckpointsTable,
	args: { canManage: true, canDelete: true },
};

export default meta;

type Story = StoryObj<typeof CheckpointsTable>;

/**
 * Frames 11.5 (`G3Dyx`), 13.1 (`Y0tHrw`) and 13.6f (`cEF7c`): hover a Margin cell for
 * the breakdown; Quiet Orbit and Driftwood are rated, Driftwood with a comment.
 */
export const List: Story = {
	decorators: [withQueries({ key: KEY, data: PAGE })],
};

/** Frame 11.5b (`r9tCT7`): plain text, no button. */
export const Empty: Story = {
	decorators: [
		withQueries({
			key: KEY,
			data: {
				...PAGE,
				total: 0,
				items: [],
				stages: [],
				totals: TOTALS_ZERO,
			},
		}),
	],
};

/** Frame 11.5c (`CJvEU`). */
export const Loading: Story = {
	decorators: [withQueries({ key: KEY, state: "pending" })],
};

/** Frame 11.5d (`Ar4Dh`). */
export const LoadFailed: Story = {
	decorators: [withQueries({ key: KEY, state: "error" })],
};

/** Without the manage permission the rows have no "Refund…". */
export const ReadOnly: Story = {
	decorators: [withQueries({ key: KEY, data: PAGE })],
	args: { canManage: false, canDelete: false },
};
