import type { Meta, StoryObj } from "@storybook/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "antd";
import type { ReactElement } from "react";
import {
	MARCUS,
	SEPTEMBER,
} from "@/components/admin/PayoutsTable/payouts.fixtures";
import type { AdminPayoutRowDto } from "@/types/checkpoints";
import { PayoutNoteModal } from ".";

const withProviders = (Story: () => ReactElement) => (
	<QueryClientProvider client={new QueryClient()}>
		<App>
			<Story />
		</App>
	</QueryClientProvider>
);

const WITHOUT_NOTE: AdminPayoutRowDto = {
	...MARCUS,
	payout: MARCUS.payout && { ...MARCUS.payout, note: null },
};

const meta: Meta<typeof PayoutNoteModal> = {
	title: "Admin/PayoutNoteModal",
	component: PayoutNoteModal,
	decorators: [withProviders],
	args: { month: SEPTEMBER.month, onClose: () => {} },
};

export default meta;

type Story = StoryObj<typeof PayoutNoteModal>;

/** Add a note: empty, Save waits for text. */
export const New: Story = { args: { row: WITHOUT_NOTE } };

/** 13.3c (`O33p7k`), Edit note: opens with the note, Save waits for a change. */
export const Edit: Story = { args: { row: MARCUS } };
