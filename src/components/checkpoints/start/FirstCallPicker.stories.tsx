import type { Meta, StoryObj } from "@storybook/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { FirstCallPicker } from "./FirstCallPicker";

const CURATOR = "curator-1";
// Wednesday 21 October 2026; the strip opens on Monday the 19th.
const EARLIEST = "2026-10-21T08:00:00.000Z";

const STARTS = [
	"2026-10-20T13:00:00.000Z",
	"2026-10-20T14:00:00.000Z",
	"2026-10-21T08:00:00.000Z",
	"2026-10-21T09:00:00.000Z",
	"2026-10-21T10:00:00.000Z",
	"2026-10-21T11:00:00.000Z",
	"2026-10-23T15:00:00.000Z",
];

const withStarts = (starts: string[]) => (Story: () => React.ReactElement) => {
	const client = new QueryClient({
		defaultOptions: { queries: { staleTime: Number.POSITIVE_INFINITY } },
	});
	client.setQueryData(
		["checkpoint-first-calls", CURATOR, "2026-10-18", "2026-10-26"],
		{ timeZone: "Europe/Lisbon", starts },
	);

	return (
		<QueryClientProvider client={client}>
			<div style={{ maxWidth: 800 }}>
				<Story />
			</div>
		</QueryClientProvider>
	);
};

const Picker = ({ initial }: { initial: string | null }) => {
	const [value, setValue] = useState(initial);

	return (
		<FirstCallPicker
			curatorId={CURATOR}
			curatorName="Marta"
			earliest={EARLIEST}
			value={value}
			onChange={setValue}
		/>
	);
};

const meta: Meta<typeof Picker> = {
	title: "Checkpoints/Start/FirstCallPicker",
	component: Picker,
};
export default meta;

/** Frame 04: the strip opened on the curator's first free day, nothing picked. */
export const Picking: StoryObj<typeof Picker> = {
	args: { initial: null },
	decorators: [withStarts(STARTS)],
};

/** An hour picked: the five calls it books are spelled out. */
export const Picked: StoryObj<typeof Picker> = {
	args: { initial: "2026-10-21T09:00:00.000Z" },
	decorators: [withStarts(STARTS)],
};

/** A week with nothing free. */
export const EmptyWeek: StoryObj<typeof Picker> = {
	args: { initial: null },
	decorators: [withStarts([])],
};
