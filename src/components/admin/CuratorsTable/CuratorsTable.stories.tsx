import type { Meta, StoryObj } from "@storybook/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "antd";
import type { ReactElement } from "react";
import { userEvent, within } from "storybook/test";
import { SkillLevel } from "@/config/prisma-enums";
import type { AdminCuratorRowDto } from "@/types/checkpoints";
import { CuratorsTable } from ".";

const row = (
	userId: string,
	extra: Partial<AdminCuratorRowDto> & Pick<AdminCuratorRowDto, "name">,
): AdminCuratorRowDto => ({
	userId,
	image: null,
	specialityId: `speciality-${userId}`,
	level: SkillLevel.Expert,
	stages: ["Concepting", "Prototyping"],
	status: "pending",
	requestedAt: "2026-10-14T09:00:00.000Z",
	approvedAt: null,
	...extra,
});

const WAITING: AdminCuratorRowDto[] = [
	row("u1", { name: "Marek Kowalski" }),
	row("u2", {
		name: "Ines Duarte",
		level: SkillLevel.Experienced,
		stages: ["Ideation", "Concepting"],
		requestedAt: "2026-10-16T09:00:00.000Z",
	}),
];

const ALL: AdminCuratorRowDto[] = [
	...WAITING,
	row("u3", {
		name: "Anna Petrova",
		stages: ["Concepting", "Prototyping", "Preparing a demo version"],
		status: "approved",
		requestedAt: "2026-08-28T09:00:00.000Z",
		approvedAt: "2026-09-02T09:00:00.000Z",
	}),
	row("u4", {
		name: "Jonas Berg",
		level: SkillLevel.Skillful,
		stages: ["Release version"],
		status: "notApproved",
	}),
];

const withProviders = (Story: () => ReactElement) => (
	<QueryClientProvider client={new QueryClient()}>
		<App>
			<Story />
		</App>
	</QueryClientProvider>
);

const meta: Meta<typeof CuratorsTable> = {
	title: "Admin/CuratorsTable",
	component: CuratorsTable,
	decorators: [withProviders],
	args: {
		filter: "pending",
		pendingCount: 2,
		canManage: true,
		onRetry: () => {},
		onFilterChange: () => {},
		onSearch: () => {},
	},
};

export default meta;

type Story = StoryObj<typeof CuratorsTable>;

/** 13.7a: Waiting for review, the default filter — Approve and Decline. */
export const Waiting: Story = { args: { rows: WAITING, status: "success" } };

/** 13.7a: All curators — Revoke on the approved row, nothing on the declined one. */
export const All: Story = {
	args: { rows: ALL, filter: "all", status: "success" },
};

/** Nothing waiting: plain secondary text. */
export const Empty: Story = {
	args: { rows: [], pendingCount: 0, status: "success" },
};

/** The head stays, rows are skeleton bars. */
export const Loading: Story = { args: { rows: undefined, status: "pending" } };

export const ErrorState: Story = {
	name: "Error",
	args: { rows: undefined, status: "error" },
};

const openFirst =
	(label: "Decline" | "Revoke"): Story["play"] =>
	async ({ canvasElement }) => {
		const [button] = within(canvasElement).getAllByRole("button", {
			name: label,
		});
		await userEvent.click(button);
	};

/** 13.7b: the note Popover, opened on Decline. */
export const DeclinePopover: Story = {
	args: { rows: WAITING, status: "success" },
	play: openFirst("Decline"),
};

/** 13.7b: the same Popover on an approved curator's Revoke. */
export const RevokePopover: Story = {
	args: { rows: ALL, filter: "all", status: "success" },
	play: openFirst("Revoke"),
};
