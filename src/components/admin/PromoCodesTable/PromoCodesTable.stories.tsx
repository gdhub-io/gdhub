import type { Meta, StoryObj } from "@storybook/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "antd";
import type { ReactElement } from "react";
import type { PromoCodeDto } from "@/types/checkpoints";
import { PromoCodesTable } from ".";

/** Dates hang off today, so Active and Expired do not age. */
const day = (offset: number) => {
	const date = new Date();
	date.setUTCDate(date.getUTCDate() + offset);
	return date.toISOString();
};

const code = (
	id: string,
	extra: Partial<PromoCodeDto> & Pick<PromoCodeDto, "code">,
): PromoCodeDto => ({
	id,
	percentOff: null,
	amountOff: null,
	timesRedeemed: 0,
	maxRedemptions: null,
	expiresAt: null,
	firstPurchaseOnly: false,
	active: true,
	...extra,
});

const CODES: PromoCodeDto[] = [
	code("p1", {
		code: "LAUNCH30",
		percentOff: 30,
		timesRedeemed: 3,
		maxRedemptions: 20,
		expiresAt: day(45),
		firstPurchaseOnly: true,
	}),
	code("p2", { code: "GAMEJAM", amountOff: 5000, timesRedeemed: 12 }),
	code("p3", { code: "DEVGAMM", percentOff: 50, maxRedemptions: 100 }),
	code("p4", {
		code: "WINTER25",
		percentOff: 25,
		timesRedeemed: 41,
		expiresAt: day(-20),
	}),
	code("p5", {
		code: "FRIENDS",
		amountOff: 1000,
		timesRedeemed: 7,
		firstPurchaseOnly: true,
		active: false,
	}),
	code("p6", {
		code: "BETA99",
		percentOff: 99,
		timesRedeemed: 2,
		maxRedemptions: 2,
		expiresAt: day(-3),
		active: false,
	}),
];

const withProviders = (Story: () => ReactElement) => (
	<QueryClientProvider client={new QueryClient()}>
		<App>
			<Story />
		</App>
	</QueryClientProvider>
);

const meta: Meta<typeof PromoCodesTable> = {
	title: "Admin/PromoCodesTable",
	component: PromoCodesTable,
	decorators: [withProviders],
	args: { onRetry: () => {}, canManage: true },
};

export default meta;

type Story = StoryObj<typeof PromoCodesTable>;

/** 11.1: Active, Off and Expired side by side; Off wins on the last row, expired switches are locked. */
export const Data: Story = { args: { codes: CODES, status: "success" } };

/** View permission only: every switch is disabled. */
export const ReadOnly: Story = {
	args: { codes: CODES, status: "success", canManage: false },
};

/** 11.2 */
export const Empty: Story = { args: { codes: [], status: "success" } };

/** 11.2b: the head stays, rows are skeleton bars. */
export const Loading: Story = { args: { codes: undefined, status: "pending" } };

/** 11.2c */
export const ErrorState: Story = {
	name: "Error",
	args: { codes: undefined, status: "error" },
};
