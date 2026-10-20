import type { Meta, StoryObj } from "@storybook/nextjs";
import { CheckpointCuratorKind, CheckpointStatus } from "@/config/prisma-enums";
import type { AdminCheckpointsPage } from "@/repositories/checkpoint-refund";
import { withQueries } from "../storyQueries";
import { CheckpointsTable } from ".";

const KEY = ["admin", "checkpoints", "list", { page: 1 }];

const row = (
	over: Partial<AdminCheckpointsPage["items"][number]>,
): AdminCheckpointsPage["items"][number] => ({
	id: "cp1",
	number: 2,
	stageName: "Prototyping",
	status: CheckpointStatus.Active,
	curatorKind: CheckpointCuratorKind.Human,
	curatorName: "Marta Ilves",
	project: { name: "Hollow Tide", slug: "hollow-tide" },
	paid: 45000,
	refunded: null,
	refundReason: null,
	canRefund: true,
	...over,
});

const PAGE: AdminCheckpointsPage = {
	total: 4,
	pageSize: 20,
	items: [
		row({}),
		row({
			id: "cp2",
			project: { name: "Lantern Keeper", slug: "lantern-keeper" },
			number: 1,
			stageName: "Ideation",
			curatorKind: CheckpointCuratorKind.AI,
			curatorName: null,
			paid: 2000,
		}),
		row({
			id: "cp3",
			project: { name: "Saltmarsh", slug: "saltmarsh" },
			status: CheckpointStatus.AwaitingCurator,
			paid: 30000,
			canRefund: false,
		}),
		row({
			id: "cp4",
			project: { name: "Paper Moons", slug: "paper-moons" },
			status: CheckpointStatus.Cancelled,
			paid: 36000,
			refunded: 24000,
			refundReason: "withdrawal",
			canRefund: false,
		}),
	],
};

const meta: Meta<typeof CheckpointsTable> = {
	title: "Admin/CheckpointsTable",
	component: CheckpointsTable,
	args: { canManage: true },
};

export default meta;

type Story = StoryObj<typeof CheckpointsTable>;

/** Frame 11.5 (`G3Dyx`). */
export const List: Story = {
	decorators: [withQueries({ key: KEY, data: PAGE })],
};

/** Frame 11.5b (`r9tCT7`): plain text, no button. */
export const Empty: Story = {
	decorators: [
		withQueries({ key: KEY, data: { ...PAGE, total: 0, items: [] } }),
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
	args: { canManage: false },
};
