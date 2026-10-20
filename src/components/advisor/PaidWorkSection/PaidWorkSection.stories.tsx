import type { Meta, StoryObj } from "@storybook/nextjs";
import { App } from "antd";
import type { ReactElement } from "react";
import { userEvent, within } from "storybook/test";
import { ExpertInvoicing } from "@/config/prisma-enums";
import type { PaidWorkDto } from "@/types/checkpoints";
import { PaidWorkSection } from ".";

const NOT_SET_UP: PaidWorkDto = {
	holder: null,
	account: null,
	invoicing: null,
	terms: null,
	termsNeeded: true,
};

const SET_UP: PaidWorkDto = {
	holder: "Marek Kowalski",
	account: "LT12 •••• 4421",
	invoicing: ExpertInvoicing.SelfEmployed,
	terms: { version: 1, acceptedAt: "2026-10-12T09:30:00.000Z" },
	termsNeeded: false,
};

const meta: Meta<typeof PaidWorkSection> = {
	title: "Advisor/PaidWorkSection",
	component: PaidWorkSection,
	decorators: [
		(Story: () => ReactElement) => (
			<App>
				<div style={{ maxWidth: 760 }}>
					<Story />
				</div>
			</App>
		),
	],
	args: {
		paidWork: NOT_SET_UP,
		onSave: async () => undefined,
	},
};

export default meta;

type Story = StoryObj<typeof PaidWorkSection>;

/** `Q8dNW0`: empty fields, the terms unticked. */
export const NotSetUp: Story = {};

/** `SyTre`: an account that fails the IBAN checksum and the terms left unticked. */
export const FieldErrors: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const [holder, account] = canvas.getAllByRole("textbox");
		await userEvent.type(holder, "Marek Kowalski");
		await userEvent.type(account, "LT12 1000 0111 01");
		await userEvent.click(canvas.getByText("Self-employed"));
		await userEvent.click(canvas.getByRole("button", { name: "Save" }));
	},
};

/** `S5YkC`: the account masked with Change, the terms accepted. */
export const SetUp: Story = { args: { paidWork: SET_UP } };

/** `g9B7RS`: after Change the saved account is replaced by an empty input. */
export const ChangingAccount: Story = {
	args: { paidWork: SET_UP },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: "Change" }));
	},
};

/** `g9B7RS`: Save shows loading; the form is read-only until the answer. */
export const Saving: Story = { args: { paidWork: SET_UP, saving: true } };

/** `g9B7RS`: the save is refused; what was typed stays. */
export const SaveFailed: Story = {
	args: {
		paidWork: SET_UP,
		onSave: () => Promise.reject(new Error("Network Error")),
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await userEvent.click(canvas.getByRole("button", { name: "Save" }));
	},
};
