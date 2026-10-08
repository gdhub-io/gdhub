"use client";

import { Card, Descriptions, Flex, Segmented, Spin, Typography } from "antd";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { SKILL_LEVEL_STEP } from "@/components/ui/SkillLevelMeter";
import { skillLevelsList } from "@/components/ui/skillLevel";
import type { SkillLevel } from "@/config/prisma-enums";
import type { GraphNode } from "./GraphCanvas";
import { LEVEL_COLORS } from "./levelColors";
import styles from "./style.module.scss";

export type TalentSpeciality = {
	id: string;
	userId: string;
	name: string;
	direction: string;
	level: SkillLevel;
	country: string | null;
	hours: number;
	hoursRange: number[];
};

type Mode = "directions" | "geography";

// cosmos.gl renders through WebGL and cannot run on the server.
const GraphCanvas = dynamic(() => import("./GraphCanvas"), {
	ssr: false,
	loading: () => (
		<Flex className={styles.canvas} align="center" justify="center">
			<Spin />
		</Flex>
	),
});

const { Title, Paragraph, Text } = Typography;

const hoursLabel = (range: number[]) => (range.length ? range.join("–") : "—");

function byDirection(specialities: TalentSpeciality[]) {
	const nodes: GraphNode[] = specialities.map((s) => ({
		id: s.id,
		cluster: s.direction,
		level: s.level,
		hours: s.hours,
		title: s.name,
		details: [
			{ label: "Direction", children: s.direction },
			{ label: "Level", children: s.level },
			{ label: "Country", children: s.country ?? "—" },
			{ label: "Hours / week", children: hoursLabel(s.hoursRange) },
		],
	}));
	return { nodes, hidden: 0 };
}

// One node per person: a talent with two specialities lives in one country once.
function byGeography(specialities: TalentSpeciality[]) {
	const people = new Map<string, TalentSpeciality[]>();
	for (const s of specialities) {
		people.set(s.userId, [...(people.get(s.userId) ?? []), s]);
	}

	const nodes: GraphNode[] = [];
	let hidden = 0;
	for (const [userId, own] of people) {
		const [first] = own;
		if (!first.country) {
			hidden++;
			continue;
		}
		const top = own.reduce((a, b) =>
			SKILL_LEVEL_STEP[b.level] > SKILL_LEVEL_STEP[a.level] ? b : a,
		);
		nodes.push({
			id: userId,
			cluster: first.country,
			level: top.level,
			hours: first.hours,
			title: own.map((s) => s.name).join(", "),
			details: [
				{ label: "Country", children: first.country },
				{ label: "Top level", children: top.level },
				{
					label: "Directions",
					children: [...new Set(own.map((s) => s.direction))].join(", "),
				},
				{ label: "Hours / week", children: hoursLabel(first.hoursRange) },
			],
		});
	}
	return { nodes, hidden };
}

export function TalentGraph({
	specialities,
}: {
	specialities: TalentSpeciality[];
}) {
	const [mode, setMode] = useState<Mode>("directions");
	const [selected, setSelected] = useState<GraphNode>();

	const { nodes, hidden } = useMemo(
		() =>
			mode === "directions"
				? byDirection(specialities)
				: byGeography(specialities),
		[mode, specialities],
	);

	const changeMode = (next: Mode) => {
		setSelected(undefined);
		setMode(next);
	};

	return (
		<div className={styles.page}>
			<GraphCanvas nodes={nodes} onSelect={setSelected} />

			<Card className={styles.panel} size="small">
				<Title level={5} style={{ marginTop: 0 }}>
					Talent graph
				</Title>
				<Segmented<Mode>
					block
					value={mode}
					onChange={changeMode}
					options={[
						{ label: "Directions", value: "directions" },
						{ label: "Geography", value: "geography" },
					]}
				/>
				<Paragraph type="secondary" className={styles.caption}>
					{mode === "directions"
						? `${nodes.length} specialities, clustered by direction.`
						: `${nodes.length} talents, clustered by country.`}{" "}
					Click a cluster to zoom in. Colour is the level, size is hours per
					week.
				</Paragraph>
				{hidden > 0 && (
					<Paragraph type="secondary">
						{hidden} talents haven't set a country and are not shown.
					</Paragraph>
				)}

				<Flex vertical gap={4}>
					{skillLevelsList.map((level) => (
						<Flex key={level.value} align="center" gap={8}>
							<span
								className={styles.swatch}
								style={{ background: LEVEL_COLORS[level.value] }}
							/>
							<Text>{level.label}</Text>
						</Flex>
					))}
				</Flex>

				{selected && (
					<Descriptions
						className={styles.details}
						size="small"
						column={1}
						title={selected.title}
						items={selected.details}
					/>
				)}
			</Card>
		</div>
	);
}
