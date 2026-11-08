"use client";

import type { Graph } from "@cosmos.gl/graph";
import { useTranslate } from "@tolgee/react";
import { Badge, ConfigProvider, Flex, Popover, Typography } from "antd";
import {
	type Ref,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from "react";
import { brand, neutral } from "@/config/design";
import {
	TRAILS_GROW_MS,
	TRAILS_LINK_WIDTH,
	TRAILS_SIGNAL_PERIOD_MS,
} from "@/config/project-trails";
import {
	buildTrailsGraph,
	type TrailPoint,
	type TrailsGraph,
} from "@/lib/workflow/project-trails";
import type {
	ProjectTrailDto,
	ProjectTrailStatus,
} from "@/types/project-trails";
import { ProjectTrailCard } from "./ProjectTrailCard";
import {
	CHECKPOINT_COLOR,
	SIGNAL_COLOR,
	TRAIL_STATUS_COLOR,
	useTrailStatusLabels,
} from "./status";
import styles from "./style.module.scss";

// cosmos.gl centres the view on half its default 4096 space.
const CENTER = 2048;

const rgba = (hex: string, alpha = 1) => [
	Number.parseInt(hex.slice(1, 3), 16) / 255,
	Number.parseInt(hex.slice(3, 5), 16) / 255,
	Number.parseInt(hex.slice(5, 7), 16) / 255,
	alpha,
];

// Sizes, strokes and colours follow frame 01.15.1 in docs/design/platform-design.pen.
const POINT_SIZE: Record<TrailPoint["kind"], number> = {
	origin: 14,
	ring: 2,
	stage: 7,
	checkpoint: 10,
	now: 11,
	checkpointEnd: 10,
	signal: 5,
	stageGoal: 7,
};

const NO_STROKE = [Number.NaN, Number.NaN, Number.NaN, Number.NaN];

// PointShape values; the enum lives in the lazily loaded bundle.
const SHAPE = { circle: 0, diamond: 3, cross: 7 } as const;

const pointShape = (point: TrailPoint, paths: ProjectTrailDto[]) => {
	if (point.kind === "checkpoint" || point.kind === "checkpointEnd")
		return SHAPE.diamond;
	if (point.end && paths[point.project ?? -1]?.status === "cancelled")
		return SHAPE.cross;
	return SHAPE.circle;
};

const pointColor = (point: TrailPoint, paths: ProjectTrailDto[]) => {
	// Where a live project stands is hollow, like the origin and the goals ahead.
	if (point.current) return rgba(neutral[950]);
	switch (point.kind) {
		case "origin":
		case "checkpointEnd":
		case "stageGoal":
			return rgba(neutral[950]);
		case "ring":
			return rgba(neutral[700]);
		case "checkpoint":
			return rgba(CHECKPOINT_COLOR);
		case "signal":
			return rgba(SIGNAL_COLOR);
		default:
			return rgba(
				point.project === undefined
					? neutral[0]
					: TRAIL_STATUS_COLOR[paths[point.project].status],
			);
	}
};

const toArrays = (graph: TrailsGraph, paths: ProjectTrailDto[]) => {
	const positions = new Float32Array(graph.points.flatMap((p) => [p.x, p.y]));
	const colors = new Float32Array(
		graph.points.flatMap((p) => pointColor(p, paths)),
	);
	// Where a live project stands is one size, whether a checkpoint is running or not.
	const sizes = new Float32Array(
		graph.points.map((p) => (p.current ? POINT_SIZE.now : POINT_SIZE[p.kind])),
	);
	const shapes = new Float32Array(
		graph.points.map((p) => pointShape(p, paths)),
	);
	const links = new Float32Array(
		graph.links.flatMap((l) => [l.source, l.target]),
	);
	const linkColors = new Float32Array(
		graph.links.flatMap((l) =>
			l.checkpoint
				? rgba(CHECKPOINT_COLOR)
				: rgba(
						TRAIL_STATUS_COLOR[paths[l.project].status],
						l.ahead === "stage" ? 0.7 : 0.55,
					),
		),
	);
	// A road is as thick as its project's score; a checkpoint's dashed stretch stays thin.
	const linkWidths = new Float32Array(
		graph.links.map((l) =>
			l.ahead === "checkpoint"
				? 1.6
				: TRAILS_LINK_WIDTH.min +
					((TRAILS_LINK_WIDTH.max - TRAILS_LINK_WIDTH.min) *
						paths[l.project].score) /
						100,
		),
	);
	// LinkStyle: 0 solid, 1 dashed.
	const linkStyles = new Float32Array(
		graph.links.map((l) => (l.ahead ? 1 : 0)),
	);
	// The black origin and the hollow goals are drawn by their stroke alone.
	const strokeOf = (p: TrailPoint): [number, number[]] => {
		if (p.kind === "origin") return [2, rgba(neutral[500])];
		if (p.kind === "checkpointEnd") return [1.6, rgba(CHECKPOINT_COLOR)];
		if (p.current && p.project !== undefined)
			return [2, rgba(TRAIL_STATUS_COLOR[paths[p.project].status])];
		if (p.kind === "stageGoal" && p.project !== undefined)
			return [1.6, rgba(TRAIL_STATUS_COLOR[paths[p.project].status])];
		return [0, NO_STROKE];
	};
	const strokes = graph.points.map(strokeOf);
	const strokeWidths = new Float32Array(strokes.map(([width]) => width));
	const strokeColors = new Float32Array(strokes.flatMap(([, color]) => color));
	return {
		positions,
		colors,
		sizes,
		shapes,
		strokeWidths,
		strokeColors,
		links,
		linkColors,
		linkWidths,
		linkStyles,
	};
};

type Selection = { point: TrailPoint; index: number; x: number; y: number };

export type ProjectTrailsGraphHandle = {
	/** Back to the opening view: every road on screen. */
	fitView: () => void;
};

const FIT_PADDING = 0.12;
const FIT_MS = 600;

export function ProjectTrailsGraph({
	paths,
	ref,
}: {
	paths: ProjectTrailDto[];
	ref?: Ref<ProjectTrailsGraphHandle>;
}) {
	const { t } = useTranslate();
	const containerRef = useRef<HTMLDivElement>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const [selected, setSelected] = useState<Selection | null>(null);
	const graphRef = useRef<Graph>(undefined);

	const graphData = useMemo(
		() => buildTrailsGraph(paths, { center: CENTER, now: new Date() }),
		[paths],
	);
	// Fit the roads, not the rings: outer rings may run off the screen.
	const roadPositions = useMemo(
		() =>
			graphData.points.flatMap((p) => (p.kind === "ring" ? [] : [p.x, p.y])),
		[graphData],
	);

	useImperativeHandle(
		ref,
		() => ({
			fitView: () => {
				setSelected(null);
				graphRef.current?.fitViewByPointPositions(
					roadPositions,
					FIT_MS,
					FIT_PADDING,
					false,
				);
			},
		}),
		[roadPositions],
	);

	useEffect(() => {
		const container = containerRef.current;
		if (!container || !paths.length) return;

		let graph: Graph | undefined;
		let frame = 0;
		let disposed = false;
		const { points, signals } = graphData;
		const arrays = toArrays(graphData, paths);

		const runSignals = (time: number) => {
			if (!graph || disposed) return;
			const progress =
				(time % TRAILS_SIGNAL_PERIOD_MS) / TRAILS_SIGNAL_PERIOD_MS;
			graph.setPointPositionsByIndices(
				signals.map((s) => s.point),
				signals.flatMap((s) => {
					const from = points[s.from];
					const to = points[s.to];
					return [
						from.x + (to.x - from.x) * progress,
						from.y + (to.y - from.y) * progress,
					];
				}),
			);
			frame = requestAnimationFrame(runSignals);
		};

		import("@cosmos.gl/graph").then(({ Graph: CosmosGraph }) => {
			if (disposed) return;
			graph = graphRef.current = new CosmosGraph(container, {
				enableSimulation: false,
				rescalePositions: false,
				fitViewOnInit: false,
				backgroundColor: neutral[950],
				attribution: "",
				enableDrag: false,
				scalePointsOnZoom: false,
				linkDefaultWidth: 1.6,
				linkDashLength: 5,
				linkDashGap: 5,
				renderHoveredPointRing: true,
				hoveredPointRingColor: neutral[0],
				focusedPointRingColor: brand[300],
				transitionDuration: TRAILS_GROW_MS,
				hoveredPointCursor: "pointer",
				pointGreyoutOpacity: 0.35,
				linkGreyoutOpacity: 0.3,
				onPointClick: (index, position) => {
					const point = points[index];
					if (point.project === undefined || !graph) return;
					const [x, y] = graph.spaceToScreenPosition(position);
					setSelected({ point, index, x, y });
				},
				onBackgroundClick: () => setSelected(null),
				onZoom: (_, userDriven) => {
					if (userDriven) setSelected(null);
				},
			});

			// Every path grows out of the centre: start all points there, then move them out.
			graph.setPointPositions(
				new Float32Array(points.flatMap(() => [CENTER, CENTER])),
			);
			graph.setPointColors(arrays.colors);
			graph.setPointSizes(arrays.sizes);
			graph.setPointShapes(arrays.shapes);
			// Points left out of the order draw underneath: the ring dots stay behind every road.
			graph.setPointRenderOrder(
				points.flatMap((p, index) => (p.kind === "ring" ? [] : [index])),
			);
			graph.setPointStrokeWidths(arrays.strokeWidths);
			graph.setPointStrokeColors(arrays.strokeColors);
			graph.setLinks(arrays.links);
			graph.setLinkColors(arrays.linkColors);
			graph.setLinkWidths(arrays.linkWidths);
			graph.setLinkStyles(arrays.linkStyles);
			graph.render(0, 0);
			graph.fitViewByPointPositions(roadPositions, 0, FIT_PADDING, false);
			graph.setPointPositions(arrays.positions);
			graph.render(0);
			window.setTimeout(() => {
				if (!disposed && signals.length)
					frame = requestAnimationFrame(runSignals);
			}, TRAILS_GROW_MS);
		});

		return () => {
			disposed = true;
			cancelAnimationFrame(frame);
			graph?.destroy();
			graphRef.current = undefined;
		};
	}, [graphData, paths, roadPositions]);

	// The selected project stays lit; the others dim. The origin and the rings belong to everyone.
	useEffect(() => {
		const project = selected?.point.project;
		const owns = (owner?: number) =>
			project === undefined || owner === undefined || owner === project;
		graphRef.current?.setConfigPartial({
			focusedPointIndex: selected?.index,
			highlightedPointIndices:
				project === undefined
					? undefined
					: graphData.points.flatMap((p, index) =>
							owns(p.project) ? [index] : [],
						),
			highlightedLinkIndices:
				project === undefined
					? undefined
					: graphData.links.flatMap((l, index) =>
							l.project === project ? [index] : [],
						),
		});
	}, [selected, graphData]);

	const statusLabel = useTrailStatusLabels();
	// Only what the graph actually draws.
	const legend = [
		...(Object.keys(TRAIL_STATUS_COLOR) as ProjectTrailStatus[])
			.filter((status) => paths.some((path) => path.status === status))
			.map((status) => ({
				color: TRAIL_STATUS_COLOR[status],
				label: statusLabel[status],
			})),
		...(graphData.points.some((point) => point.checkpoint)
			? [
					{
						color: CHECKPOINT_COLOR,
						label: t("lab.projectTrails.legend.checkpoint", "Checkpoint"),
					},
				]
			: []),
		...(graphData.signals.length
			? [
					{
						color: SIGNAL_COLOR,
						label: t(
							"lab.projectTrails.legend.signal",
							"Active checkpoint: signal to its end",
						),
					},
				]
			: []),
	];

	if (!paths.length) {
		return (
			<Flex className={styles.root} align="center" justify="center">
				<Typography.Text type="secondary">
					{t("lab.projectTrails.empty", "No public projects yet")}
				</Typography.Text>
			</Flex>
		);
	}

	const project =
		selected?.point.project === undefined
			? null
			: paths[selected.point.project];

	return (
		<div ref={rootRef} className={styles.root}>
			<div ref={containerRef} className={styles.canvas} />

			{selected && project && (
				<Popover
					open
					placement="top"
					// Inside the root, so the card reads the dark band's --gd-* roles.
					getPopupContainer={() => rootRef.current ?? document.body}
					// Frame 01.15.3: the card floats, so it is the one surface with a fill and a shadow.
					styles={{
						container: {
							padding: 0,
							border: "1px solid var(--gd-color-border)",
							borderRadius: "var(--gd-radius-card)",
							background: "var(--gd-color-surface)",
							boxShadow: "var(--gd-elevation-e3)",
						},
					}}
					onOpenChange={(open) => {
						if (!open) setSelected(null);
					}}
					content={
						<ProjectTrailCard project={project} point={selected.point} />
					}
				>
					<span
						className={styles.anchor}
						style={{ left: selected.x, top: selected.y }}
					/>
				</Popover>
			)}

			<ConfigProvider theme={{ components: { Badge: { statusSize: 8 } } }}>
				<Flex wrap justify="center" gap={24} className={styles.legend}>
					{legend.map(({ color, label }) => (
						<Badge
							key={label}
							color={color}
							text={
								<Typography.Text
									type="secondary"
									className={styles.legendLabel}
								>
									{label}
								</Typography.Text>
							}
						/>
					))}
				</Flex>
			</ConfigProvider>
		</div>
	);
}
