import type { Meta, StoryObj } from "@storybook/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "antd";
import axios, { AxiosError, type AxiosResponse } from "axios";
import type { ReactElement } from "react";
import { userEvent, within } from "storybook/test";
import { NewPromoCodeModal } from ".";

const withProviders = (Story: () => ReactElement) => (
	<QueryClientProvider client={new QueryClient()}>
		<App>
			<Story />
		</App>
	</QueryClientProvider>
);

const meta: Meta<typeof NewPromoCodeModal> = {
	title: "Admin/NewPromoCodeModal",
	component: NewPromoCodeModal,
	decorators: [withProviders],
	parameters: { layout: "fullscreen" },
	args: { open: true, onClose: () => {}, firstPurchase: false },
};

export default meta;

type Story = StoryObj<typeof NewPromoCodeModal>;

/** 11.3: Percent mode, filled in. */
export const Percent: Story = {
	play: async () => {
		const body = within(document.body);
		await userEvent.type(await body.findByPlaceholderText("LAUNCH30"), "jam30");
		await userEvent.type(body.getAllByRole("spinbutton")[0], "30");
	},
};

/** Stripe can limit a code to a first purchase; Paddle cannot, so the box is hidden there. */
export const WithFirstPurchase: Story = { args: { firstPurchase: true } };

/** 11.3b: Amount mode, and the server answers that the code is taken. */
export const AmountCodeTaken: Story = {
	beforeEach: () => {
		const adapter = axios.defaults.adapter;
		axios.defaults.adapter = async (config) => {
			const response = {
				status: 409,
				statusText: "Conflict",
				data: { error: "codeTaken" },
				headers: {},
				config,
			} as AxiosResponse;
			throw new AxiosError(
				"Conflict",
				AxiosError.ERR_BAD_REQUEST,
				config,
				null,
				response,
			);
		};
		return () => {
			axios.defaults.adapter = adapter;
		};
	},
	play: async () => {
		const body = within(document.body);
		await userEvent.type(
			await body.findByPlaceholderText("LAUNCH30"),
			"LAUNCH",
		);
		await userEvent.click(body.getByText("Amount"));
		await userEvent.type(body.getAllByRole("spinbutton")[0], "50");
		await userEvent.click(body.getByRole("button", { name: "Create code" }));
	},
};
