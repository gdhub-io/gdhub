"use client";

import { Graph, getRgbaColor } from "@cosmos.gl/graph";
import type { DescriptionsProps } from "antd";
import { Typography } from "antd";
import { useEffect, useMemo, useRef } from "react";
import { neutral } from "@/config/design";
import type { SkillLevel } from "@/config/prisma-enums";
import { LEVEL_COLORS } from "./levelColors";
import styles from "./style.module.scss";

export type GraphNode = {
	id: string;
	cluster: string;
	level: SkillLevel;
	hours: number;
	title: string;
	details: DescriptionsProps["items"];
};

const SIZE_RANGE = [6, 20] as const;
const SPACE_SIZE = 4096;

/** Pins each label to its cluster's centre; called every tick and zoom. */
function placeLabels(g: Graph, labels: (HTMLDivElement | null)[]) {
	const positions = g.getClusterPositions();
	labels.forEach((label, i) => {
		const x = positions[i * 2];
		const y = positions[i * 2 + 1];
		if (!label || x === undefined || y === undefined) return;
		const [left, top] = g.spaceToScreenPosition([x, y]);
		label.style.transform = `translate(${left}px, ${top}px) translate(-50%, -50%)`;
	});
}

export default function GraphCanvas({
	nodes,
	onSelect,
}: {
	nodes: GraphNode[];
	onSelect: (node: GraphNode | undefined) => void;
}) {
	const container = useRef<HTMLDivElement>(null);
	const clusters = useMemo(
		() => [...new Set(nodes.map((n) => n.cluster))].sort(),
		[nodes],
	);
	const graph = useRef<Graph>(undefined);
	const overlayRef = useRef<HTMLDivElement>(null);
	const labels = useRef<(HTMLDivElement | null)[]>([]);
	// The graph's callbacks are bound once; they read the current data through this.
	const latest = useRef({ nodes, onSelect });
	latest.current = { nodes, onSelect };

	useEffect(() => {
		const place = () => placeLabels(g, labels.current);
		const g = new Graph(container.current, {
			spaceSize: SPACE_SIZE,
			backgroundColor: neutral[25],
			pointDefaultSize: SIZE_RANGE[0],
			scalePointsOnZoom: true,
			transitionDuration: 0,
			renderHoveredPointRing: true,
			hoveredPointRingColor: neutral[700],
			hoveredPointCursor: "pointer",
			simulationGravity: 0.1,
			simulationRepulsion: 0.5,
			simulationCluster: 0.3,
			simulationCollision: 0.95,
			simulationCollisionPadding: 4,
			simulationFriction: 0.85,
			// Roughly the number of ticks until the layout freezes (~10s); the default 5000 keeps it drifting.
			simulationDecay: 600,
			fitViewOnInit: true,
			fitViewDelay: 1500,
			fitViewPadding: 0.2,
			onSimulationEnd: () => g.fitView(600, 0.2),
			onSimulationTick: place,
			onZoom: place,
			onPointClick: (index) =>
				latest.current.onSelect(latest.current.nodes[index]),
			onBackgroundClick: () => latest.current.onSelect(undefined),
		});
		graph.current = g;

		// Wheel and pinch over a label would zoom the page; hand them to the graph instead.
		const overlay = overlayRef.current;
		const forwardWheel = (e: WheelEvent) => {
			e.preventDefault();
			container.current
				?.querySelector("canvas")
				?.dispatchEvent(new WheelEvent("wheel", e));
		};
		overlay?.addEventListener("wheel", forwardWheel, { passive: false });

		return () => {
			overlay?.removeEventListener("wheel", forwardWheel);
			g.destroy();
			graph.current = undefined;
		};
	}, []);

	useEffect(() => {
		const g = graph.current;
		if (!g) return;
		const clusterIndex = new Map(clusters.map((name, i) => [name, i]));
		const maxHours = Math.max(1, ...nodes.map((n) => n.hours));
		const centre = SPACE_SIZE / 2;
		// Every point starts near the centre and is pushed out into its cluster by the forces.
		const seed = () => {
			const angle = Math.random() * 2 * Math.PI;
			const r = Math.sqrt(Math.random()) * 20;
			return [centre + r * Math.cos(angle), centre + r * Math.sin(angle)];
		};

		g.setPointPositions(new Float32Array(nodes.flatMap(seed)));
		g.setPointColors(
			new Float32Array(
				nodes.flatMap((n) => getRgbaColor(LEVEL_COLORS[n.level])),
			),
		);
		g.setPointSizes(
			new Float32Array(
				nodes.map(
					(n) =>
						SIZE_RANGE[0] +
						(n.hours / maxHours) * (SIZE_RANGE[1] - SIZE_RANGE[0]),
				),
			),
		);
		g.setPointClusters(nodes.map((n) => clusterIndex.get(n.cluster)));
		g.render(1, 0);
		const refit = setTimeout(() => g.fitView(600, 0.2), 1500);
		return () => clearTimeout(refit);
	}, [nodes, clusters]);

	const focusCluster = (name: string) => {
		const indices = nodes.flatMap((n, i) => (n.cluster === name ? [i] : []));
		graph.current?.fitViewByPointIndices(indices, 600, 0.3);
	};

	return (
		<div className={styles.canvas}>
			<div ref={container} className={styles.canvas} />
			<div ref={overlayRef} className={styles.labels}>
				{clusters.map((name, i) => (
					<div
						key={name}
						ref={(el) => {
							labels.current[i] = el;
						}}
						className={styles.label}
					>
						<Typography.Text
							strong
							className={styles.clusterName}
							onClick={() => focusCluster(name)}
						>
							{name}
						</Typography.Text>
					</div>
				))}
			</div>
		</div>
	);
}
