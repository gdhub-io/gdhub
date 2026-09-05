import type { Meta, StoryObj } from "@storybook/nextjs";
import type { CSSProperties, ReactNode } from "react";
import { WORK_DIRECTIONS } from "@/components/DirectionBadge";
import { type DesignMode, densities, roles } from "./roles";
import {
	amber,
	brand,
	directionColors,
	elevation,
	focusRingWidth,
	neutral,
	radius,
	semantic,
	space,
} from "./tokens";

/**
 * The token reference. Every value here is the one the app actually reads, so a
 * swatch that looks wrong is a bug in `tokens.ts` rather than in this file.
 */
const meta: Meta = {
	title: "Design system/Tokens",
	parameters: { layout: "padded", controls: { disable: true } },
};

export default meta;

const mono: CSSProperties = {
	fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
	fontSize: 11,
	color: "var(--gd-color-text-secondary)",
};

function Section({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: ReactNode;
}) {
	return (
		<section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
			<div>
				<h3
					style={{
						fontFamily: "var(--gd-font-display)",
						fontSize: 20,
						fontWeight: 600,
						letterSpacing: "-0.02em",
						margin: 0,
					}}
				>
					{title}
				</h3>
				{description && (
					<p
						style={{
							fontSize: 13,
							color: "var(--gd-color-text-secondary)",
							margin: "4px 0 0",
							maxWidth: 620,
						}}
					>
						{description}
					</p>
				)}
			</div>
			{children}
		</section>
	);
}

function Page({ children }: { children: ReactNode }) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
			{children}
		</div>
	);
}

/** A ramp reads as one object, so the steps sit edge to edge. */
function Ramp({ scale }: { scale: Record<string | number, string> }) {
	return (
		<div style={{ display: "flex", flexWrap: "wrap" }}>
			{Object.entries(scale).map(([step, value]) => (
				<div key={step} style={{ width: 96 }}>
					<div
						style={{
							height: 56,
							background: value,
							border: "1px solid var(--gd-color-border)",
						}}
					/>
					<div style={{ padding: "6px 2px" }}>
						<div style={{ fontSize: 12, fontWeight: 500 }}>{step}</div>
						<div style={mono}>{value}</div>
					</div>
				</div>
			))}
		</div>
	);
}

export const Colour: StoryObj = {
	render: () => (
		<Page>
			<Section
				title="Neutral"
				description="Warm ramp at a constant hue. Chrome, text and borders come from here — the audit found twenty greys before it existed."
			>
				<Ramp scale={neutral} />
			</Section>

			<Section
				title="Brand"
				description="An orientation colour inside the product: active state, focus ring, links. It never fills a button here — a wall of brand-filled buttons reads as errors. Filled brand belongs to marketing surfaces."
			>
				<Ramp scale={brand} />
			</Section>

			<Section
				title="Amber — marketing only"
				description="The landing addresses two audiences and separates them by colour: authors get the brand, specialists get this. Far enough from the brand in hue to read as a different invitation. It has no job inside the product."
			>
				<Ramp scale={amber} />
			</Section>

			<Section
				title="Semantic"
				description="Each meaning is a trio: solid for icons and dots, tint for banners and rows, on-tint for the text drawn on it."
			>
				<div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
					{Object.entries(semantic).map(([name, value]) => (
						<div
							key={name}
							style={{
								width: 220,
								borderRadius: radius.card,
								overflow: "hidden",
								border: "1px solid var(--gd-color-border)",
							}}
						>
							<div
								style={{
									background: value.tint,
									color: value.onTint,
									padding: "14px 16px",
									fontSize: 13,
									fontWeight: 500,
									display: "flex",
									alignItems: "center",
									gap: 8,
								}}
							>
								<span
									style={{
										width: 10,
										height: 10,
										borderRadius: "50%",
										background: value.solid,
									}}
								/>
								{name}
							</div>
							<div
								style={{
									padding: "10px 16px",
									display: "flex",
									flexDirection: "column",
									gap: 2,
								}}
							>
								<span style={mono}>solid {value.solid}</span>
								<span style={mono}>tint {value.tint}</span>
								<span style={mono}>onTint {value.onTint}</span>
							</div>
						</div>
					))}
				</div>
			</Section>
		</Page>
	),
};

/** Colour belongs to content; the chrome around it stays neutral. */
export const Directions: StoryObj = {
	render: () => (
		<Page>
			<Section
				title="Work directions"
				description="Eighteen crafts, double-encoded as colour and icon so the pairs stay distinguishable when the tints do not. Read them through getWorkDirection() or <IconTile direction>, never by hex."
			>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
						gap: 10,
					}}
				>
					{WORK_DIRECTIONS.map(({ slug, label, icon: Icon }) => {
						const { tint, ink } = directionColors[slug];
						return (
							<div
								key={slug}
								style={{
									background: tint,
									borderRadius: radius.card,
									padding: 12,
									display: "flex",
									alignItems: "center",
									gap: 10,
								}}
							>
								<Icon size={20} stroke={2} color={ink} />
								<div style={{ minWidth: 0 }}>
									<div style={{ fontSize: 13, color: ink, fontWeight: 500 }}>
										{label}
									</div>
									<div style={{ ...mono, color: ink, opacity: 0.7 }}>
										{tint} · {ink}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</Section>
		</Page>
	),
};

const roleGroups: [string, (keyof (typeof roles)["light"])[]][] = [
	["Surface", ["bg", "surface", "surfaceSunken", "surfaceInverse"]],
	["Border", ["border", "borderSubtle", "borderStrong", "borderFocus"]],
	["Text", ["text", "textSecondary", "textTertiary", "textInverse"]],
	["Action", ["action", "actionHover", "onAction"]],
	["Accent", ["accent", "accentHover", "accentSubtle", "link"]],
	["Accent — marketing", ["accentAlt", "accentAltHover", "onAccentAlt"]],
];

function RoleTable({ mode }: { mode: DesignMode }) {
	const set = roles[mode];
	const inverse = mode === "inverse";
	return (
		<div
			style={{
				background: set.bg,
				color: set.text,
				borderRadius: radius.panel,
				padding: 20,
				display: "flex",
				flexDirection: "column",
				gap: 16,
			}}
		>
			<div style={{ fontSize: 13, fontWeight: 600 }}>{mode}</div>
			{roleGroups.map(([group, names]) => (
				<div
					key={group}
					style={{ display: "flex", flexDirection: "column", gap: 6 }}
				>
					<div style={{ fontSize: 11, opacity: 0.6, letterSpacing: "0.06em" }}>
						{group.toUpperCase()}
					</div>
					<div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
						{names.map((name) => (
							<div key={name} style={{ width: 150 }}>
								<div
									style={{
										height: 40,
										borderRadius: radius.control,
										background: set[name],
										border: `1px solid ${inverse ? set.borderStrong : set.border}`,
									}}
								/>
								<div style={{ fontSize: 11, marginTop: 4 }}>{name}</div>
								<div style={{ ...mono, color: "inherit", opacity: 0.6 }}>
									{set[name]}
								</div>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

/** The same role names in both modes — which is what lets an inverse band work. */
export const Roles: StoryObj = {
	render: () => (
		<Page>
			<Section
				title="Roles"
				description="Components address roles, never primitives. Both modes define the same names, so a dark band re-declares them on its own subtree and everything nested follows without knowing it moved."
			>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
						gap: 16,
					}}
				>
					<RoleTable mode="light" />
					<RoleTable mode="inverse" />
				</div>
			</Section>
		</Page>
	),
};

export const Spacing: StoryObj = {
	render: () => (
		<Page>
			<Section
				title="Spacing"
				description="A 4-grid. Anything between two steps is a decision that has not been made yet."
			>
				<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
					{Object.entries(space).map(([step, value]) => (
						<div
							key={step}
							style={{ display: "flex", alignItems: "center", gap: 12 }}
						>
							<span style={{ ...mono, width: 72 }}>space[{step}]</span>
							<span style={{ fontSize: 12, width: 40 }}>{value}px</span>
							<div
								style={{
									height: 16,
									width: value,
									background: "var(--gd-color-accent, #F15541)",
									borderRadius: 2,
								}}
							/>
						</div>
					))}
				</div>
			</Section>

			<Section
				title="Radius"
				description="Five steps, picked by what the shape is rather than by how big it is."
			>
				<div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
					{Object.entries(radius).map(([name, value]) => (
						<div key={name} style={{ textAlign: "center" }}>
							<div
								style={{
									width: 96,
									height: 72,
									borderRadius: value,
									background: "var(--gd-color-surface-sunken)",
									border: "1px solid var(--gd-color-border-strong)",
								}}
							/>
							<div style={{ fontSize: 12, marginTop: 6, fontWeight: 500 }}>
								{name}
							</div>
							<div style={mono}>{value}px</div>
						</div>
					))}
				</div>
			</Section>
		</Page>
	),
};

export const Elevation: StoryObj = {
	render: () => (
		<Page>
			<Section
				title="Elevation"
				description="e0 is the default: a card separates by fill, not by shadow. A shadow means the thing floats above the page — dropdown, modal, popover."
			>
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: 24,
						background: "var(--gd-color-bg)",
						padding: 24,
						borderRadius: radius.panel,
					}}
				>
					{Object.entries(elevation).map(([name, value]) => (
						<div key={name} style={{ textAlign: "center" }}>
							<div
								style={{
									width: 160,
									height: 90,
									borderRadius: radius.card,
									background: "var(--gd-color-surface)",
									boxShadow: value,
								}}
							/>
							<div style={{ fontSize: 12, marginTop: 8, fontWeight: 500 }}>
								{name}
							</div>
							<div style={{ ...mono, maxWidth: 160 }}>{value}</div>
						</div>
					))}
				</div>
			</Section>

			<Section
				title="Focus"
				description="One ring everywhere, so focus is never something a component invents for itself."
			>
				<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
					<div
						style={{
							width: 200,
							height: 40,
							borderRadius: radius.control,
							background: "var(--gd-color-surface)",
							border: "1px solid var(--gd-color-border-strong)",
							boxShadow: `0 0 0 ${focusRingWidth}px rgba(241, 85, 65, 0.2)`,
						}}
					/>
					<span style={mono}>focusRingWidth {focusRingWidth}px</span>
				</div>
			</Section>
		</Page>
	),
};

/** Same tokens, two rhythms: the product packs, marketing breathes. */
export const Density: StoryObj = {
	render: () => (
		<Page>
			<Section
				title="Density"
				description="Control heights and paddings are the only thing that changes between product and marketing. Set a height by hand only when fighting a genuine exception."
			>
				<div style={{ display: "flex", flexWrap: "wrap", gap: 32 }}>
					{(Object.keys(densities) as (keyof typeof densities)[]).map(
						(name) => (
							<div
								key={name}
								style={{ display: "flex", flexDirection: "column", gap: 10 }}
							>
								<div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
								{(
									[
										["controlHeightSm", "Small"],
										["controlHeight", "Default"],
										["controlHeightLg", "Large"],
									] as const
								).map(([key, label]) => (
									<div
										key={key}
										style={{ display: "flex", alignItems: "center", gap: 12 }}
									>
										<div
											style={{
												height: densities[name][key],
												minWidth: 150,
												borderRadius: radius.control,
												background: "var(--gd-color-action)",
												color: "var(--gd-color-on-action)",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												fontSize: densities[name].fontSize,
												fontWeight: 500,
											}}
										>
											{label}
										</div>
										<span style={mono}>{densities[name][key]}px</span>
									</div>
								))}
								<div
									style={{ display: "flex", flexDirection: "column", gap: 2 }}
								>
									{(
										[
											"fontSize",
											"cardPadding",
											"cellPaddingBlock",
											"cellPaddingInline",
											"sectionGap",
											"pageGutter",
										] as const
									).map((key) => (
										<span key={key} style={mono}>
											{key} {densities[name][key]}px
										</span>
									))}
								</div>
							</div>
						),
					)}
				</div>
			</Section>
		</Page>
	),
};
