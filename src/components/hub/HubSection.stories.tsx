import type { Meta, StoryObj } from "@storybook/nextjs";
import { IconCalendar, IconCode, IconUsers } from "@tabler/icons-react";
import { IconTile, StatusDot } from "@/components/ui";
import {
	getHubSectionShellClass,
	HubSectionBleed,
	HubSectionBody,
	HubSectionHeader,
	type HubSectionShell,
} from "./HubSection";

/**
 * The card every hub panel is built from — ten screens compose it, so the three
 * shells below are what the hub is made of.
 *
 * It is not one component but a set: pick a shell class for the outer card, then
 * put a `HubSectionHeader` and a `HubSectionBody` inside. `HubSectionBleed` lets
 * a list run to the card's edge while the header keeps its padding.
 */
const meta: Meta = {
	title: "Components/HubSection",
	parameters: { layout: "padded", controls: { disable: true } },
};

export default meta;

const rows: [string, typeof IconCode, string][] = [
	["Unity Gameplay Programmer", IconCode, "development"],
	["Character Artist", IconUsers, "2d-art-animation"],
	["Technical Artist", IconCalendar, "technical-art"],
];

function List({ bleed = false }: { bleed?: boolean }) {
	const list = (
		<div style={{ display: "flex", flexDirection: "column" }}>
			{rows.map(([title, icon, slug]) => (
				<div
					key={title}
					style={{
						display: "flex",
						alignItems: "center",
						gap: 12,
						padding: "10px 0",
					}}
				>
					<IconTile icon={icon} direction={slug} size="sm" />
					<span style={{ flex: 1, fontSize: 14 }}>{title}</span>
					<StatusDot tone="success" label="Open" />
				</div>
			))}
		</div>
	);

	return bleed ? <HubSectionBleed>{list}</HubSectionBleed> : list;
}

function Section({
	shell,
	title,
	bleed,
}: {
	shell: HubSectionShell;
	title: string;
	bleed?: boolean;
}) {
	return (
		<div className={getHubSectionShellClass(shell)}>
			<HubSectionHeader title={title} linkHref="#" linkLabel="View all" />
			<HubSectionBody flush={bleed}>
				<List bleed={bleed} />
			</HubSectionBody>
		</div>
	);
}

/** The three shells side by side — the difference is the card, not the content. */
export const Shells: StoryObj = {
	render: () => (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
				gap: 24,
				background: "var(--gd-color-bg)",
				padding: 24,
			}}
		>
			<Section shell="main" title="main" />
			<Section shell="inset" title="inset" />
			<Section shell="sidebar" title="sidebar" />
		</div>
	),
};

/** A header can take arbitrary children instead of the link — a count, a filter. */
export const HeaderVariants: StoryObj = {
	render: () => (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 16,
				background: "var(--gd-color-bg)",
				padding: 24,
			}}
		>
			<div className={getHubSectionShellClass("main")}>
				<HubSectionHeader title="Title only" />
				<HubSectionBody>
					<List />
				</HubSectionBody>
			</div>
			<div className={getHubSectionShellClass("main")}>
				<HubSectionHeader
					title="With a link"
					linkHref="#"
					linkLabel="View all"
				/>
				<HubSectionBody>
					<List />
				</HubSectionBody>
			</div>
			<div className={getHubSectionShellClass("main")}>
				<HubSectionHeader title="With custom children">
					<StatusDot tone="info" label="3 pending" />
				</HubSectionHeader>
				<HubSectionBody>
					<List />
				</HubSectionBody>
			</div>
		</div>
	),
};

/** `flush` + `HubSectionBleed`: rows reach the card edge, the header does not. */
export const Bleed: StoryObj = {
	render: () => (
		<div
			style={{ background: "var(--gd-color-bg)", padding: 24, maxWidth: 420 }}
		>
			<Section shell="sidebar" title="Recently joined" bleed />
		</div>
	),
};
