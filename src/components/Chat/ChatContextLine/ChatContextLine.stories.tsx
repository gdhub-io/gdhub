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

const longComment: RoomContext = {
	...adviceContext,
	data: {
		...adviceContext.data,
		comment: Array.from(
			{ length: 6 },
			() =>
				"Gradients in the sky shader band badly on Android only — iOS and the editor are clean. I tried 16-bit textures, dithering and a linear colour space.",
		).join("\n\n"),
	},
};

const meta: Meta<typeof ChatContextLine> = {
	title: "Chat/ChatContextLine",
	component: ChatContextLine,
	parameters: { layout: "centered" },
	// The section overlays the timeline: these lines stand in for messages.
	decorators: [
		(Story) => (
			<div
				style={{
					width: 520,
					height: 720,
					background: "var(--gd-color-surface)",
					border: "1px solid var(--gd-color-border)",
					display: "flex",
					flexDirection: "column",
				}}
			>
				<Story />
				<div style={{ padding: 24, color: "var(--gd-color-text-secondary)" }}>
					{Array.from({ length: 14 }, (_, i) => `Message ${i + 1}`).map(
						(text) => (
							<p key={text}>{text} stays where it is.</p>
						),
					)}
				</div>
			</div>
		),
	],
};

export default meta;

type Story = StoryObj<typeof ChatContextLine>;

/** `kWwIn` case 1: collapsed. */
export const Advice: Story = { args: { slot: slotOf(adviceContext) } };

/** Case 2: expanded over the timeline, resolve action. */
export const AdviceOpen: Story = {
	args: { slot: slotOf(adviceContext), defaultOpen: true },
};

/** A long comment scrolls inside the section; the action row stays put. */
export const AdviceLongComment: Story = {
	args: { slot: slotOf(longComment), defaultOpen: true },
};

export const Vacancy: Story = { args: { slot: slotOf(vacancyContext) } };

/** Case 4: Project, Applied and Status share a row; open-position opens a new tab. */
export const VacancyOpen: Story = {
	args: { slot: slotOf(vacancyContext), defaultOpen: true },
};

/** Case 6: closed — the dot on the line, no close action. */
export const Closed: Story = {
	args: { slot: slotOf(closedAdviceContext), defaultOpen: true },
};
