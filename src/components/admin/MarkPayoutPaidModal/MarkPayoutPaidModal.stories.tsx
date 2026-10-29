import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState } from "react";
import { screen, userEvent } from "storybook/test";
import {
	ANNA,
	SEPTEMBER,
} from "@/components/admin/PayoutsTable/payouts.fixtures";
import type { PayoutDetailsDto } from "@/types/checkpoints";
import { MarkPayoutPaidDialog, type MarkPayoutPaidDialogProps } from ".";

const DETAILS: PayoutDetailsDto = {
	holder: "Anna Petrova",
	account: "DE89 3704 0044 0532 0130 00",
	invoicing: "SelfEmployed",
	seenAt: "2026-10-03T09:00:00.000Z",
};

const meta: Meta<typeof MarkPayoutPaidDialog> = {
	title: "Admin/MarkPayoutPaidModal",
	component: MarkPayoutPaidDialog,
	args: {
		name: ANNA.name ?? "",
		month: SEPTEMBER.month,
		amount: ANNA.amount,
		count: ANNA.checkpoints.length,
		details: DETAILS,
		alreadyPaid: null,
		failure: null,
		submitting: false,
		onSubmit: () => {},
		onClose: () => {},
	},
};

export default meta;

type Story = StoryObj<typeof MarkPayoutPaidDialog>;

/** Frame 13.3 (`A9bzy`): today's date, the reference still to type. */
export const Default: Story = {};

/** The full details are read when the dialog opens. */
export const LoadingDetails: Story = { args: { details: undefined } };

/** 13.3b (`WkexH`): another admin or a double click got there first. */
export const AlreadyPaid: Story = {
	args: {
		alreadyPaid: {
			paidOn: "2026-10-03T00:00:00.000Z",
			reference: "SEB-20261003-0419",
			paidBy: "Dmitry Drynov",
		},
	},
};

const typeReference = () =>
	userEvent.type(
		screen.getByRole("textbox", { name: "Reference" }),
		"SEB-20261003-0419",
	);

/** Confirming: primary loading, Cancel disabled. */
export const Submitting: Story = {
	render: function Render(args: MarkPayoutPaidDialogProps) {
		const [submitting, setSubmitting] = useState(false);
		return (
			<MarkPayoutPaidDialog
				{...args}
				submitting={submitting}
				onSubmit={() => setSubmitting(true)}
			/>
		);
	},
	play: async () => {
		await typeReference();
		await userEvent.click(
			screen.getByRole("button", { name: /^Mark .* paid$/ }),
		);
	},
};

/** The curator changed the details since the dialog opened. */
export const DetailsChanged: Story = {
	args: { failure: "detailsChanged" },
	play: typeReference,
};
