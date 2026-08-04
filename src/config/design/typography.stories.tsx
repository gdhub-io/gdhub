import type { Meta, StoryObj } from "@storybook/nextjs";
import { IconCode, IconPalette, IconTool } from "@tabler/icons-react";
import { Button, ConfigProvider } from "antd";
import {
	Bricolage_Grotesque,
	Figtree,
	Inter,
	Manrope,
	Plus_Jakarta_Sans,
	Sora,
	Space_Grotesk,
	Wix_Madefor_Display,
	Wix_Madefor_Text,
} from "next/font/google";
import type { CSSProperties } from "react";
import { IconTile } from "@/components/ui/IconTile";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatusDot } from "@/components/ui/StatusDot";
import { ViewAllLink } from "@/components/ui/ViewAllLink";
import { fontSize, fontWeight, letterSpacing, lineHeight } from "./tokens";

const monoLabel: CSSProperties = {
	fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
	fontSize: 11,
	color: "var(--gd-color-text-secondary)",
};

/**
 * A bench for choosing the type pair. Every candidate is shown on the same
 * block of real product UI, because a font decides nothing in a specimen sheet
 * and everything in a list row.
 *
 * Loaders sit at module scope and repeat their options because `next/font`
 * only accepts literals — a shared options object fails the build. The
 * specimen applies them by overriding `--gd-font-ui` and `--gd-font-display`,
 * which is exactly how the tokens resolve in the app.
 */
const inter = Inter({ subsets: ["latin"], display: "swap" });
const manrope = Manrope({ subsets: ["latin"], display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap" });
const figtree = Figtree({ subsets: ["latin"], display: "swap" });
const sora = Sora({ subsets: ["latin"], display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], display: "swap" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], display: "swap" });
const madeforText = Wix_Madefor_Text({ subsets: ["latin"], display: "swap" });
const madeforDisplay = Wix_Madefor_Display({
	subsets: ["latin"],
	display: "swap",
});

type FontPair = {
	id: string;
	name: string;
	/** Why this pair is on the bench — the tone it brings, not its history. */
	note: string;
	ui: string;
	display: string;
};

const pairs: FontPair[] = [
	{
		id: "jakarta",
		name: "Plus Jakarta Sans",
		note: "In use. One family both roles — warmer than Inter, still neutral.",
		ui: jakarta.style.fontFamily,
		display: jakarta.style.fontFamily,
	},
	{
		id: "inter-manrope",
		name: "Inter + Manrope",
		note: "The previous shape of the system: a neutral UI face under a separate display one.",
		ui: inter.style.fontFamily,
		display: manrope.style.fontFamily,
	},
	{
		id: "inter-bricolage",
		name: "Inter + Bricolage Grotesque",
		note: "Inter disappears; Bricolage gives the headings a hand-cut edge.",
		ui: inter.style.fontFamily,
		display: bricolage.style.fontFamily,
	},
	{
		id: "inter-space",
		name: "Inter + Space Grotesk",
		note: "A technical display face — the games tone, if the product ever wants it.",
		ui: inter.style.fontFamily,
		display: spaceGrotesk.style.fontFamily,
	},
	{
		id: "madefor",
		name: "Wix Madefor Text + Display",
		note: "Drawn as a pair, so the two sizes tune to each other by design.",
		ui: madeforText.style.fontFamily,
		display: madeforDisplay.style.fontFamily,
	},
	{
		id: "figtree-sora",
		name: "Figtree + Sora",
		note: "Friendliest body with the most geometric headings.",
		ui: figtree.style.fontFamily,
		display: sora.style.fontFamily,
	},
];

const rows: [string, typeof IconCode, string, string][] = [
	["development", IconCode, "Unity Gameplay Programmer", "$12,480"],
	["2d-art-animation", IconPalette, "Character Artist", "$8,200"],
	["technical-art", IconTool, "Technical Artist", "$10,750"],
];

/**
 * One pair, shown on the layout the guidelines describe.
 *
 * The nested `ConfigProvider` matters: antd bakes a resolved family into its
 * generated CSS, so a theme set higher up pins every control to one font and
 * the buttons stop following the pair. Pointing antd at the variable puts them
 * back under the specimen's control.
 */
function Specimen({ pair }: { pair: FontPair }) {
	return (
		<ConfigProvider theme={{ token: { fontFamily: "var(--gd-font-ui)" } }}>
			<section
				style={
					{
						"--gd-font-ui": pair.ui,
						"--gd-font-display": pair.display,
						fontFamily: "var(--gd-font-ui)",
						background: "var(--gd-color-bg)",
						borderRadius: "var(--gd-radius-panel)",
						padding: 24,
						display: "flex",
						flexDirection: "column",
						gap: 16,
					} as CSSProperties
				}
			>
				<header style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
					<span
						style={{
							fontSize: 12,
							fontWeight: 600,
							letterSpacing: "0.04em",
							textTransform: "uppercase",
						}}
					>
						{pair.name}
					</span>
					<span
						style={{ fontSize: 12, color: "var(--gd-color-text-tertiary)" }}
					>
						{pair.note}
					</span>
				</header>

				<h1
					style={{
						fontFamily: "var(--gd-font-display)",
						fontSize: "var(--gd-font-size-h1)",
						fontWeight: 600,
						letterSpacing: "-0.02em",
						margin: 0,
					}}
				>
					Open positions
				</h1>
				<p style={{ fontSize: 14, lineHeight: 1.55, margin: 0, maxWidth: 640 }}>
					A place for indie teams to find the people they are missing — eighteen
					crafts, each with its own colour and icon, so a list of roles stays
					scannable at a glance rather than turning into a wall of grey rows.
				</p>

				<SectionHeading
					level={3}
					title="Team members"
					action={<ViewAllLink href="#" label="View all" />}
				/>

				<div
					style={{
						background: "var(--gd-color-surface)",
						borderRadius: "var(--gd-radius-card)",
					}}
				>
					{rows.map(([slug, icon, title, rate]) => (
						<div
							key={slug}
							style={{
								display: "flex",
								alignItems: "center",
								gap: 14,
								padding: "12px 16px",
							}}
						>
							<IconTile icon={icon} direction={slug} />
							<span style={{ flex: 1, fontSize: 14 }}>{title}</span>
							<span style={{ fontSize: 13, fontFeatureSettings: '"tnum"' }}>
								{rate}
							</span>
							<StatusDot tone="success" label="Open" />
						</div>
					))}
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
					<Button type="primary">Post a vacancy</Button>
					<span style={{ fontSize: 13, fontWeight: 400 }}>Regular 400</span>
					<span style={{ fontSize: 13, fontWeight: 500 }}>Medium 500</span>
					<span style={{ fontSize: 13, fontWeight: 600 }}>Semibold 600</span>
				</div>
			</section>
		</ConfigProvider>
	);
}

const meta: Meta = {
	title: "Design system/Typography",
	parameters: { layout: "padded" },
};

export default meta;

/** Every candidate on the same block — scroll and compare, never judge in isolation. */
export const Pairs: StoryObj = {
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
			{pairs.map((pair) => (
				<Specimen key={pair.id} pair={pair} />
			))}
		</div>
	),
};

/** The scale itself: few sizes, big jumps between them. */
export const Scale: StoryObj = {
	parameters: { controls: { disable: true } },
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
			<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
				{Object.entries(fontSize).map(([name, size]) => (
					<div
						key={name}
						style={{ display: "flex", alignItems: "baseline", gap: 16 }}
					>
						<span style={{ ...monoLabel, width: 84 }}>{name}</span>
						<span style={{ ...monoLabel, width: 48 }}>{size}px</span>
						<span
							style={{
								fontSize: size,
								fontFamily:
									size >= fontSize.h3 ? "var(--gd-font-display)" : undefined,
								fontWeight: size >= fontSize.h3 ? 600 : 400,
								letterSpacing: size >= fontSize.h3 ? "-0.02em" : undefined,
								lineHeight: 1.2,
							}}
						>
							Open positions
						</span>
					</div>
				))}
			</div>

			<div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
				{Object.entries(fontWeight).map(([name, weight]) => (
					<div key={name}>
						<div style={{ fontSize: 20, fontWeight: weight }}>
							Open positions
						</div>
						<span style={monoLabel}>
							{name} {weight}
						</span>
					</div>
				))}
			</div>

			<div style={{ display: "flex", flexWrap: "wrap", gap: 32 }}>
				<div>
					{Object.entries(lineHeight).map(([name, value]) => (
						<div key={name} style={monoLabel}>
							lineHeight.{name} {value}
						</div>
					))}
				</div>
				<div>
					{Object.entries(letterSpacing).map(([name, value]) => (
						<div key={name} style={monoLabel}>
							letterSpacing.{name} {value}em
						</div>
					))}
				</div>
			</div>
		</div>
	),
};

/** One pair at a time, at full width — for the final call. */
export const Pair: StoryObj<{ pair: string }> = {
	argTypes: {
		pair: {
			control: "select",
			options: pairs.map((p) => p.id),
			name: "Font pair",
		},
	},
	args: { pair: pairs[0].id },
	render: ({ pair }) => (
		<Specimen pair={pairs.find((p) => p.id === pair) ?? pairs[0]} />
	),
};
