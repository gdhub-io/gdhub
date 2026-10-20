import type { Meta, StoryObj } from "@storybook/nextjs";
import { CheckpointCuratorKind, CheckpointStatus } from "@/config/prisma-enums";
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
	curatorName: "Marta Ilves",
	projectName: "Hollow Tide",
	startedAt: "2026-10-12T00:00:00.000Z",
	dueAt: "2026-11-08T00:00:00.000Z",
	paid: 45000,
	refunded: null,
	refundReason: null,
	canRefund: true,
	...over,
});

const PAGE: AdminCheckpointsPageDto = {
	total: 4,
	pageSize: 20,
	stages: ["Ideation", "Prototyping"],
	items: [
		row({}),
		row({
			id: "cp2",
			projectName: "Lantern Keeper",
			number: 1,
			stageName: "Ideation",
			curatorName: null,
			paid: 2000,
		}),
		row({
			id: "cp3",
			projectName: "Saltmarsh",
			status: CheckpointStatus.AwaitingCurator,
			paid: 30000,
			canRefund: false,
		}),
		row({
			id: "cp4",
			projectName: "Paper Moons",
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
		withQueries({
			key: KEY,
			data: { ...PAGE, total: 0, items: [], stages: [] },
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
	args: { canManage: false },
};
