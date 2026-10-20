import type { Meta, StoryObj } from "@storybook/nextjs";
import {
	IconCalendar,
	IconChecks,
	IconCode,
	IconPlus,
	IconRobot,
	IconWallet,
} from "@tabler/icons-react";
import { Button } from "antd";
import { WORK_DIRECTIONS } from "@/components/DirectionBadge";
import { SkillLevel } from "@/config/prisma-enums";
import { EmptyState } from "./EmptyState";
import { IconTile } from "./IconTile";
import { KpiCard } from "./KpiCard";
import { KpiSplit } from "./KpiSplit";
import { SectionHeading } from "./SectionHeading";
import { SkillLevelMeter } from "./SkillLevelMeter";
import { StatusDot, type StatusTone } from "./StatusDot";
import { ViewAllLink } from "./ViewAllLink";

const meta: Meta = {
	title: "Design system/Primitives",
	parameters: { layout: "padded", controls: { disable: true } },
};

export default meta;

const card: React.CSSProperties = {
	background: "var(--gd-color-surface)",
	borderRadius: "var(--gd-radius-card)",
	padding: 20,
};

/** Tinted tiles carry the direction colour; the chrome around them stays grey. */
export const Tiles: StoryObj = {
	render: () => (
		<div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
			{WORK_DIRECTIONS.slice(0, 8).map((d) => (
				<IconTile key={d.slug} icon={d.icon} direction={d.slug} />
			))}
			<IconTile icon={IconPlus} size="sm" />
			<IconTile icon={IconCalendar} size="lg" />
		</div>
	),
};

/** Statuses repeat down a list, so they are a dot and a word — never a filled pill. */
export const Statuses: StoryObj = {
	render: () => (
		<div style={{ display: "flex", gap: 24 }}>
			{(
				[
					["success", "Paid out"],
					["warning", "Payment due"],
					["danger", "Expired"],
					["info", "In review"],
					["neutral", "Draft"],
				] as [StatusTone, string][]
			).map(([tone, label]) => (
				<StatusDot key={tone} tone={tone} label={label} />
			))}
		</div>
	),
};

/**
 * An ordinal scale drawn as a quantity: five blocks filled to the level, one
 * colour. The name always travels with it — the blocks alone are a chart.
 */
export const SkillLevels: StoryObj = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
			{(
				[
					[SkillLevel.Novice, "Novice"],
					[SkillLevel.Beginner, "Beginner"],
					[SkillLevel.Skillful, "Skillful"],
					[SkillLevel.Experienced, "Experienced"],
					[SkillLevel.Expert, "Expert"],
				] as [SkillLevel, string][]
			).map(([level, label]) => (
				<div
					key={level}
					style={{ display: "flex", alignItems: "center", gap: 12 }}
				>
					<SkillLevelMeter level={level} />
					<span style={{ fontSize: 13 }}>{label}</span>
					<SkillLevelMeter level={level} size="compact" />
					<span
						style={{ fontSize: 11, color: "var(--gd-color-text-secondary)" }}
					>
						compact
					</span>
				</div>
			))}
		</div>
	),
};

export const Heading: StoryObj = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
			<SectionHeading
				title="Vacancies and applicants"
				action={<ViewAllLink href="/hub/jobs" label="View all" />}
			/>
			<SectionHeading
				level={3}
				title="Team members"
				description="Everyone with access to this project."
			/>
		</div>
	),
};

export const Empty: StoryObj = {
	render: () => (
		<div style={card}>
			<EmptyState
				icon={IconChecks}
				title="You're all caught up"
				description="When an application or a contract needs you, it shows up here."
			/>
		</div>
	),
};

/** The rules working together — the layout the guidelines describe. */
export const Composed: StoryObj = {
	render: () => (
		<div
			style={{
				background: "var(--gd-color-bg)",
				padding: 24,
				display: "flex",
				flexDirection: "column",
				gap: 16,
			}}
		>
			<SectionHeading
				title="Open positions"
				action={<ViewAllLink href="/hub/jobs" label="View all" />}
			/>
			<div style={{ ...card, padding: 0 }}>
				{[
					["development", "Unity Gameplay Programmer", "info", "In review"],
					["2d-art-animation", "Character Artist", "success", "Open"],
					["technical-art", "Technical Artist", "warning", "Closing"],
				].map(([slug, title, tone, status]) => (
					<div
						key={title}
						style={{
							display: "flex",
							alignItems: "center",
							gap: 14,
							padding: "12px 20px",
						}}
					>
						<IconTile icon={IconCode} direction={slug} />
						<span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>
							{title}
						</span>
						<StatusDot tone={tone as StatusTone} label={status} />
					</div>
				))}
			</div>
			<Button type="primary">Post a vacancy</Button>
		</div>
	),
};

/** Metric cards: a figure with its caption, the loading bars, and a split bar with its legend. */
export const Kpis: StoryObj = {
	render: () => (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(3, 240px)",
				gap: 12,
			}}
		>
			<KpiCard
				icon={IconWallet}
				name="To pay"
				value="$1,375.50"
				note="Due by 15 Oct"
			/>
			<KpiCard icon={IconWallet} name="To pay" loading />
			<KpiCard icon={IconRobot} name="AI · person">
				<KpiSplit
					spread
					tooltip="22 with the AI curator · 28 with a person"
					parts={[
						{
							key: "ai",
							label: "AI",
							value: "44%",
							count: 22,
							color: "var(--gd-chart-series-1)",
						},
						{
							key: "person",
							label: "Person",
							value: "56%",
							count: 28,
							color: "var(--gd-chart-series-2)",
						},
					]}
				/>
			</KpiCard>
		</div>
	),
};
