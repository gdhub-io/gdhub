import type { Meta, StoryObj } from "@storybook/nextjs";
import {
	adviceContext,
	closedAdviceContext,
	vacancyContext,
} from "../fixtures/context";
import { ChatContextLine } from "./index";
import { contextSlot, type RoomContext } from "./kinds";

// Storybook's Tolgee has no data, so `t` falls back to the default text.
const t = (_key: string, fallback: string, params?: Record<string, string>) =>
	fallback.replace(/\{(\w+)\}/g, (_, name) => params?.[name] ?? "");

const slotOf = (context: RoomContext) =>
	// biome-ignore lint/style/noNonNullAssertion: fixtures are known kinds
	contextSlot(context, { t, invited: false, onClose: () => undefined })!;

const meta: Meta<typeof ChatContextLine> = {
	title: "Chat/ChatContextLine",
	component: ChatContextLine,
	parameters: { layout: "centered" },
	decorators: [
		(Story) => (
			<div
				style={{
					width: 520,
					height: 420,
					background: "var(--gd-color-surface)",
				}}
			>
				<Story />
			</div>
		),
	],
};

export default meta;

type Story = StoryObj<typeof ChatContextLine>;

/** Frame `kWwIn`, case 1: the collapsed line for an advice request. */
export const Advice: Story = { args: { slot: slotOf(adviceContext) } };

/** Popover open: every field and the resolve action. */
export const AdviceOpen: Story = {
	args: { slot: slotOf(adviceContext), defaultOpen: true },
};

export const Vacancy: Story = { args: { slot: slotOf(vacancyContext) } };

/** Position link, application date, open-position and close actions. */
export const VacancyOpen: Story = {
	args: { slot: slotOf(vacancyContext), defaultOpen: true },
};

/** "Closed" on the line; the popover has no close action. */
export const Closed: Story = {
	args: { slot: slotOf(closedAdviceContext), defaultOpen: true },
};
