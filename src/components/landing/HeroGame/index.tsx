"use client";

import {
	Canvas,
	type ThreeEvent,
	useFrame,
	useLoader,
	useThree,
} from "@react-three/fiber";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, Popover, Typography } from "antd";
import {
	type Ref,
	Suspense,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	AdditiveBlending,
	AnimationClip,
	AnimationMixer,
	CanvasTexture,
	Color,
	EdgesGeometry,
	type Group,
	type Mesh,
	MeshBasicMaterial,
	MeshStandardMaterial,
	type PerspectiveCamera,
	PlaneGeometry,
	SRGBColorSpace,
	Vector3,
} from "three";
import {
	type GLTF,
	GLTFLoader,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { InverseBand } from "@/components/ui/InverseBand";
import { amber, brand, chartSeries, neutral } from "@/config/design/tokens";
import {
	type ActorId,
	BOARD,
	type Cell,
	cellKey,
	GUIDE,
	isBeside,
	isTeam,
	MOVE_RANGE,
	type Reach,
	reachable,
	START,
	TEAM,
	type TeamId,
	type TileKind,
	ZONE,
} from "./board";
import styles from "./style.module.scss";

const STEPS_PER_SECOND = 5;
// Keep in step with `.bubble` in style.module.scss.
const BUBBLE_WIDTH = 260;
const TAIL_INSET = 30;
const TAIL_GAP = 12;
// About 38° above the board, looking from the corner.
const CAMERA: [number, number, number] = [10, 11, 10];
// No brown on the palette: the bridge planks are a darkened amber.
const WOOD = new Color(amber[600]).multiplyScalar(0.6);
// The chest's planks run redder than the bridge's.
const CHEST_WOOD = new Color(amber[600])
	.lerp(new Color(brand[700]), 0.4)
	.multiplyScalar(0.75);
// The highlight is decoration: picking stays with the plate and block beneath.
// A line's default pick radius is a whole world unit, so its outline would
// otherwise answer for its neighbours.
const ignoreRay = () => null;
const TILE_EDGES = new EdgesGeometry(new PlaneGeometry(0.9, 0.9));

const ACTOR_COLOR: Record<ActorId, string> = {
	author: brand[500],
	programmer: chartSeries.slot1,
	artist: chartSeries.slot3,
	sage: amber[400],
	robot: chartSeries.slot6,
	scout: chartSeries.slot5,
};

// Board cells are laid out from the origin; the scene is centred on the board.
// The height is the top of the cell's plate.
const toWorld = (cell: Cell): [number, number, number] => [
	cell.x - (BOARD.cols - 1) / 2,
	lift(cell),
	cell.z - (BOARD.rows - 1) / 2,
];

// Plates sit a touch above or below level, so even the walkable floor is uneven.
const lift = (cell: Cell) => noise(cell, 1) * 0.06;

// Warm grey stone, each plate a shade apart from its neighbours.
const plateColor = (cell: Cell) => {
	const color = new Color(neutral[600]).lerp(
		new Color(neutral[300]),
		shade(cell),
	);
	// Some plates lean warm and rosy, some cool and mossy, most stay grey.
	const lean = noise(cell, 7);
	if (lean > 0.15) color.lerp(new Color(brand[300]), (lean - 0.15) * 0.4);
	if (lean < -0.15)
		color.lerp(new Color(chartSeries.slot4), (-lean - 0.15) * 0.3);
	return color;
};

// Plates differ in thickness, so the island's underside reads as rock, not a slab.
const depthOf = (cell: Cell & { tall?: boolean }) =>
	cell.tall ? 1.6 : 0.4 + shade(cell) * 0.6;

// The light paving plate on top of each dark block; trees and rocks stand on
// the bare block, a plate's thickness lower.
const PLATE = 0.14;

// A second deterministic value per cell, centred on zero.
const noise = (cell: Cell, seed: number) =>
	shade({ x: cell.x + seed * 17, z: cell.z - seed * 31 }) - 0.5;

// Deterministic per-tile shade, so the stone does not look like one flat sheet.
const shade = ({ x, z }: Cell) =>
	((Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1) * 0.5 + 0.5;

/**
 * `baked` (the default) draws the island from island.glb, its light baked in
 * Blender; `live` builds it from the models and lights it in real time, and is
 * what the bake is made from (see the BakeSource story).
 */
export const HeroGame = ({ look = "baked" }: { look?: "baked" | "live" }) => {
	const [meeting, setMeeting] = useState<Meeting | null>(null);
	const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
	const root = useRef<HTMLDivElement>(null);

	const close = () => {
		setMeeting(null);
		setAnchor(null);
	};

	return (
		<div className={styles.root} ref={root}>
			<Canvas
				className={styles.canvas}
				shadows
				dpr={[1, 2]}
				camera={{ position: CAMERA, fov: 30, near: 0.1, far: 200 }}
			>
				<FitCamera />
				<Lights />
				<Suspense fallback={null}>
					<Game look={look} onMeet={(m) => (m ? setMeeting(m) : close())} />
				</Suspense>
				{meeting && <ScreenAnchor at={meeting.at} onChange={setAnchor} />}
			</Canvas>
			{meeting && anchor && (
				<Dialogue
					meeting={meeting}
					anchor={anchor}
					// Opens leftwards when a rightward bubble would run off the scene.
					leftward={anchor.x + BUBBLE_WIDTH > (root.current?.clientWidth ?? 0)}
					container={() => root.current ?? document.body}
					onClose={close}
				/>
			)}
		</div>
	);
};

// Tracks where a point above a board cell lands on screen, for HTML laid over the canvas.
const ScreenAnchor = ({
	at,
	onChange,
}: {
	at: Cell;
	onChange: (point: { x: number; y: number }) => void;
}) => {
	const last = useRef({ x: Number.NaN, y: Number.NaN });
	const point = useMemo(() => new Vector3(), []);

	useFrame(({ camera, size }) => {
		const [x, , z] = toWorld(at);
		point.set(x, 0.7, z).project(camera);
		const next = {
			x: Math.round(((point.x + 1) / 2) * size.width),
			y: Math.round(((1 - point.y) / 2) * size.height),
		};
		if (next.x === last.current.x && next.y === last.current.y) return;
		last.current = next;
		onChange(next);
	});

	return null;
};

const Dialogue = ({
	meeting,
	anchor,
	leftward,
	container,
	onClose,
}: {
	meeting: Meeting;
	anchor: { x: number; y: number };
	leftward: boolean;
	container: () => HTMLElement;
	onClose: () => void;
}) => {
	const { t } = useTranslate();

	// The one approached speaks; the buttons are the answers of the member who came.
	const lines: Partial<
		Record<`${ActorId}>${TeamId}`, { line: string; accept: string }>
	> = {
		"scout>author": {
			line: t(
				"landing.heroGame.dialogue.scoutToAuthor",
				"A game with a team behind it, author? Show me a build, and I'll back it.",
			),
			accept: t(
				"landing.heroGame.dialogue.scoutToAuthorAccept",
				"Show the build",
			),
		},
		"sage>programmer": {
			line: t(
				"landing.heroGame.dialogue.sageToProgrammer",
				"Lost, coder? I've walked this road to release. Need a guide?",
			),
			accept: t(
				"landing.heroGame.dialogue.sageToProgrammerAccept",
				"Lead the way",
			),
		},
		"robot>artist": {
			line: t(
				"landing.heroGame.dialogue.robotToArtist",
				"Artist, 3 of 6 artifacts found. Draw the store capsule next?",
			),
			accept: t(
				"landing.heroGame.dialogue.robotToArtistAccept",
				"Start drawing",
			),
		},
		"programmer>author": {
			line: t(
				"landing.heroGame.dialogue.programmerToAuthor",
				"The prototype runs, author. Want to play it before the scout does?",
			),
			accept: t(
				"landing.heroGame.dialogue.programmerToAuthorAccept",
				"Play it",
			),
		},
		"artist>author": {
			line: t(
				"landing.heroGame.dialogue.artistToAuthor",
				"Concept art is done. Shall I start on the store page?",
			),
			accept: t("landing.heroGame.dialogue.artistToAuthorAccept", "Go ahead"),
		},
		"author>programmer": {
			line: t(
				"landing.heroGame.dialogue.authorToProgrammer",
				"We still have no soundtrack. Ask the old sage where to find one?",
			),
			accept: t(
				"landing.heroGame.dialogue.authorToProgrammerAccept",
				"I'll ask",
			),
		},
		"artist>programmer": {
			line: t(
				"landing.heroGame.dialogue.artistToProgrammer",
				"Can you get my new sprites into the build today?",
			),
			accept: t(
				"landing.heroGame.dialogue.artistToProgrammerAccept",
				"Send them over",
			),
		},
		"author>artist": {
			line: t(
				"landing.heroGame.dialogue.authorToArtist",
				"The store page needs a capsule. Can you draw one this week?",
			),
			accept: t("landing.heroGame.dialogue.authorToArtistAccept", "On it"),
		},
		"programmer>artist": {
			line: t(
				"landing.heroGame.dialogue.programmerToArtist",
				"The build still opens on a grey screen. Got a title screen?",
			),
			accept: t(
				"landing.heroGame.dialogue.programmerToArtistAccept",
				"Give me a day",
			),
		},
	};
	const said = lines[`${meeting.speaker}>${meeting.listener}`];
	if (!said) return null;
	const { line, accept } = said;

	return (
		<Popover
			open
			arrow={false}
			placement={leftward ? "topRight" : "topLeft"}
			autoAdjustOverflow={false}
			// Puts the bubble's tail, not its corner, over the speaker.
			align={{ offset: [leftward ? TAIL_INSET : -TAIL_INSET, -TAIL_GAP] }}
			getPopupContainer={container}
			classNames={{
				container: `${styles.bubble} ${leftward ? styles.tailRight : ""}`,
			}}
			content={
				// The game's UI keeps product-sized controls inside the marketing page.
				<InverseBand density="product" transparent>
					<Flex vertical gap="small">
						<Typography.Text className={styles.line}>{line}</Typography.Text>
						<Flex gap="small">
							<Button
								className={styles.accept}
								type="primary"
								size="small"
								block
								onClick={onClose}
							>
								{accept}
							</Button>
							<Button
								className={styles.decline}
								size="small"
								block
								onClick={onClose}
							>
								{t("landing.heroGame.decline", "Not yet")}
							</Button>
						</Flex>
					</Flex>
				</InverseBand>
			}
		>
			<div
				key={`${anchor.x}:${anchor.y}`}
				className={styles.anchor}
				style={{ left: anchor.x, top: anchor.y }}
			/>
		</Popover>
	);
};

const corners = BOARD.tiles.flatMap((tile) => {
	const [x, , z] = toWorld(tile);
	return [-0.5, 0.5].flatMap((dx) =>
		[-0.5, 0.5].flatMap((dz) =>
			[-PLATE - depthOf(tile), 0.9].map((y) => new Vector3(x + dx, y, z + dz)),
		),
	);
});

// Fits the island's real footprint, not the layout's bounding grid, and
// centres it. Under perspective that has no closed form, so it converges:
// each pass moves the camera to fill FILL of the frame and re-centres.
const FitCamera = () => {
	const camera = useThree((s) => s.camera) as PerspectiveCamera;
	const size = useThree((s) => s.size);

	useLayoutEffect(() => {
		const FILL = 0.88;
		const direction = new Vector3(...CAMERA).normalize();
		const target = new Vector3();
		const point = new Vector3();
		let distance = 30;
		camera.aspect = size.width / size.height;

		for (let pass = 0; pass < 6; pass++) {
			camera.position.copy(target).addScaledVector(direction, distance);
			camera.lookAt(target);
			camera.updateMatrixWorld();
			camera.updateProjectionMatrix();

			let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity];
			for (const corner of corners) {
				point.copy(corner).project(camera);
				minX = Math.min(minX, point.x);
				maxX = Math.max(maxX, point.x);
				minY = Math.min(minY, point.y);
				maxY = Math.max(maxY, point.y);
			}

			// Half the frame's height and width at the target, in world units.
			const halfHeight = distance * Math.tan((camera.fov * Math.PI) / 360);
			const halfWidth = halfHeight * camera.aspect;
			const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
			const up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
			target
				.addScaledVector(right, ((minX + maxX) / 2) * halfWidth)
				.addScaledVector(up, ((minY + maxY) / 2) * halfHeight);
			distance *= Math.max(maxX - minX, maxY - minY) / 2 / FILL;
		}
	}, [camera, size]);

	return null;
};

// Warm light from the checkpoint where the team stands, cold light from the
// unexplored back edge.
export const Lights = () => {
	const [wx, , wz] = toWorld({ x: 4, z: 4 });
	const [cx, , cz] = toWorld({ x: 5, z: -2 });
	const [gx, , gz] = toWorld({ x: 4, z: -2 });

	return (
		<>
			<ambientLight intensity={0.85} />
			<directionalLight
				castShadow
				// Low and from the side: the baked chips and bevels need a raking light.
				position={[-7, 5, 3]}
				intensity={1.8}
				// A raking light stripes every lit face with shadow acne without these.
				shadow-bias={-0.0004}
				shadow-normalBias={0.03}
				shadow-mapSize={[2048, 2048]}
				shadow-camera-left={-9}
				shadow-camera-right={9}
				shadow-camera-top={9}
				shadow-camera-bottom={-9}
			/>
			<pointLight
				color={amber[400]}
				position={[wx, 1.4, wz]}
				intensity={14}
				distance={7}
				decay={1.6}
			/>
			<pointLight
				color={chartSeries.slot1}
				position={[cx, 1.6, cz]}
				intensity={50}
				distance={10}
				decay={1.5}
			/>
			<Glow at={[gx, 0.8, gz]} color={chartSeries.slot1} />
		</>
	);
};

// The cold light made visible: a soft halo in the dark behind the island.
const Glow = ({
	at,
	color,
}: {
	at: [number, number, number];
	color: string;
}) => {
	const texture = useMemo(() => {
		const canvas = document.createElement("canvas");
		canvas.width = canvas.height = 256;
		const ctx = canvas.getContext("2d");
		if (ctx) {
			const { r, g, b } = new Color(color);
			const rgba = (a: number) =>
				`rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
			const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
			gradient.addColorStop(0, rgba(0.9));
			gradient.addColorStop(0.4, rgba(0.35));
			gradient.addColorStop(1, rgba(0));
			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, 256, 256);
		}
		const t = new CanvasTexture(canvas);
		t.colorSpace = SRGBColorSpace;
		return t;
	}, [color]);

	useEffect(() => () => texture.dispose(), [texture]);

	return (
		<sprite
			position={at}
			scale={[11, 8, 1]}
			renderOrder={-1}
			raycast={ignoreRay}
		>
			<spriteMaterial
				map={texture}
				transparent
				depthWrite={false}
				blending={AdditiveBlending}
				opacity={0.95}
			/>
		</sprite>
	);
};

type Move = { id: TeamId; path: Cell[] };

type Meeting = { speaker: ActorId; listener: TeamId; at: Cell };

const Game = ({
	look,
	onMeet,
}: {
	look: "baked" | "live";
	onMeet: (meeting: Meeting | null) => void;
}) => {
	const [positions, setPositions] = useState(START);
	const [selected, setSelected] = useState<TeamId>("author");
	const [hovered, setHovered] = useState<string | null>(null);
	const [pointerOnPawn, setPointerOnPawn] = useState(false);
	const [move, setMove] = useState<Move | null>(null);
	const gl = useThree((s) => s.gl);

	const guideKey = cellKey(positions[GUIDE[selected]]);

	// Every tile the selected member can move to, plus its guide's tile: picking
	// the guide walks to the nearest tile beside it.
	const targets = useMemo(() => {
		if (move) return new Map<string, Reach>();
		const blocked = new Set(
			(Object.keys(positions) as ActorId[])
				.filter((id) => id !== selected)
				.map((id) => cellKey(positions[id])),
		);
		const reach = reachable(
			positions[selected],
			blocked,
			MOVE_RANGE,
			ZONE[selected],
		);
		const guide = positions[GUIDE[selected]];
		const approach = [
			{ cost: 0, path: [positions[selected]] },
			...reach.values(),
		]
			.filter((r) => isBeside(r.path[r.path.length - 1], guide))
			.sort((a, b) => a.cost - b.cost)[0];
		if (approach) reach.set(cellKey(guide), approach);
		return reach;
	}, [positions, selected, move]);

	const target = hovered ? targets.get(hovered) : undefined;

	useEffect(() => {
		gl.domElement.style.cursor = target || pointerOnPawn ? "pointer" : "";
	}, [gl, target, pointerOnPawn]);

	const arrive = () => {
		if (!move) return;
		const end = move.path[move.path.length - 1];
		setPositions((p) => ({ ...p, [move.id]: end }));
		setMove(null);
		const listener = move.id;
		// The guide comes first; otherwise whichever teammate is now beside.
		const speaker = [GUIDE[listener], ...TEAM].find(
			(id) => id !== listener && isBeside(end, positions[id]),
		);
		if (speaker) onMeet({ speaker, listener, at: positions[speaker] });
	};

	const go = (key: string) => {
		const r = targets.get(key);
		if (!r) return;
		setHovered(null);
		if (r.cost === 0) {
			const speaker = GUIDE[selected];
			return onMeet({ speaker, listener: selected, at: positions[speaker] });
		}
		onMeet(null);
		setMove({ id: selected, path: r.path });
	};

	const isGuide = (id: ActorId) =>
		cellKey(positions[id]) === guideKey && targets.has(guideKey);

	return (
		<group>
			{BOARD.tiles.map((tile) => {
				const key = cellKey(tile);
				return (
					<TileHit
						key={key}
						cell={tile}
						state={
							!targets.has(key)
								? "idle"
								: key === hovered
									? "hovered"
									: "reachable"
						}
						onOver={() => setHovered(key)}
						onOut={() => setHovered((h) => (h === key ? null : h))}
						onPick={() => go(key)}
					/>
				);
			})}

			{target && target.cost > 0 && (
				<PathPreview path={target.path} cost={target.cost} />
			)}

			{(Object.keys(positions) as ActorId[]).map((id) => {
				const team = isTeam(id);
				const pickable = !move && (team || isGuide(id));
				return (
					<Pawn
						key={id}
						id={id}
						cell={positions[id]}
						path={move?.id === id ? move.path : undefined}
						selected={id === selected}
						onArrive={arrive}
						onPointer={
							pickable
								? (on) =>
										team
											? setPointerOnPawn(on)
											: setHovered(on ? guideKey : null)
								: undefined
						}
						onPick={
							pickable
								? () => {
										setPointerOnPawn(false);
										if (isTeam(id)) setSelected(id);
										else go(guideKey);
									}
								: undefined
						}
					/>
				);
			})}

			{look === "live" ? <Island /> : <BakedIsland />}
		</group>
	);
};

/** Everything that never moves: the stone, the firs and rocks, the bridge, the chest. */
export const Island = ({ ref }: { ref?: Ref<Group> }) => (
	<group ref={ref} name="island">
		{BOARD.tiles.map((tile) => (
			<Stone key={cellKey(tile)} cell={tile} kind={tile.kind} />
		))}
		<Chest />
	</group>
);

// The island with its light baked in by scripts/hero-game/bake-island.py: one
// mesh, one texture, no lighting to compute.
const BakedIsland = () => {
	const gltf = useLoader(GLTFLoader, "/models/hero-game/island.glb") as GLTF;
	const island = useMemo(() => {
		const scene = gltf.scene.clone();
		scene.traverse((o) => {
			const mesh = o as Mesh;
			if (!mesh.isMesh) return;
			const baked = (mesh.material as MeshStandardMaterial).map;
			// The light is already in the texture; tone mapping it again washes it out.
			mesh.material = new MeshBasicMaterial({ map: baked, toneMapped: false });
		});
		return scene;
	}, [gltf]);
	return <primitive object={island} />;
};

// Where the pointer lands on a cell: an invisible box, plus the move highlight.
const TileHit = ({
	cell,
	state,
	onOver,
	onOut,
	onPick,
}: {
	cell: Cell;
	state: "idle" | "reachable" | "hovered";
	onOver: () => void;
	onOut: () => void;
	onPick: () => void;
}) => {
	const [x, , z] = toWorld(cell);
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: a three.js object, not a DOM element
		<group
			position={[x, 0, z]}
			onPointerOver={(e: ThreeEvent<PointerEvent>) => {
				e.stopPropagation();
				onOver();
			}}
			onPointerOut={onOut}
			onClick={(e: ThreeEvent<MouseEvent>) => {
				e.stopPropagation();
				onPick();
			}}
		>
			<mesh position={[0, -0.3, 0]}>
				<boxGeometry args={[1, 0.66, 1]} />
				<meshBasicMaterial visible={false} />
			</mesh>
			{state !== "idle" && (
				<group
					position={[0, lift(cell) + 0.02, 0]}
					rotation={[-Math.PI / 2, 0, 0]}
				>
					<mesh raycast={ignoreRay}>
						<planeGeometry args={[0.9, 0.9]} />
						<meshBasicMaterial
							color={brand[500]}
							transparent
							opacity={state === "hovered" ? 0.7 : 0.38}
							depthWrite={false}
						/>
					</mesh>
					<lineSegments geometry={TILE_EDGES} raycast={ignoreRay}>
						<lineBasicMaterial color={brand[300]} />
					</lineSegments>
				</group>
			)}
		</group>
	);
};

const Stone = ({ cell, kind }: { cell: Cell; kind: TileKind }) => {
	const [x, , z] = toWorld(cell);
	const depth = depthOf(cell);
	const paved = kind === "ground" || kind === "islet";
	const stone = useModels();
	const plateMaterial = useTinted(stone.plate.material, plateColor(cell));
	const blockMaterial = useTinted(
		stone.block.material,
		new Color(paved ? neutral[900] : neutral[800]),
	);

	if (kind === "bridge") return <Bridge at={[x, 0, z]} />;

	return (
		<group position={[x, 0, z]}>
			<mesh
				geometry={stone.block.geometry}
				material={blockMaterial}
				position={[0, -PLATE - depth / 2, 0]}
				scale={[1, depth, 1]}
				receiveShadow
			/>
			{paved && (
				// Laid by hand: each plate sits a touch off level.
				<mesh
					position={[0, -PLATE / 2 + lift(cell), 0]}
					rotation={[
						noise(cell, 2) * 0.025,
						// A quarter turn per plate, so the chipped edges never repeat.
						Math.floor(shade(cell) * 4) * (Math.PI / 2) + noise(cell, 3) * 0.06,
						noise(cell, 4) * 0.025,
					]}
					geometry={stone.plate.geometry}
					material={plateMaterial}
					castShadow
					receiveShadow
				/>
			)}
			<group position={[0, -PLATE, 0]}>
				{kind === "tree" && (
					<Tree
						size={1.3 + shade(cell) * 0.8}
						turn={noise(cell, 5) * Math.PI}
					/>
				)}
				{kind === "rock" && (
					<Rock
						size={1.5 + shade(cell) * 0.5}
						turn={noise(cell, 6) * Math.PI}
					/>
				)}
			</group>
		</group>
	);
};

// Built by scripts/hero-game/build-models.py: bevelled stone with baked grain
// and chips, a faceted fir and a boulder.
const useModels = () => {
	const [plate, block, fir, boulder, bridge, chest] = useLoader(GLTFLoader, [
		"/models/hero-game/plate.glb",
		"/models/hero-game/block.glb",
		"/models/hero-game/fir.glb",
		"/models/hero-game/boulder.glb",
		"/models/hero-game/bridge.glb",
		"/models/hero-game/chest.glb",
	]) as GLTF[];
	return {
		plate: meshOf(plate),
		block: meshOf(block),
		foliage: meshOf(fir, "foliage"),
		trunk: meshOf(fir, "trunk"),
		boulder: meshOf(boulder, "boulder"),
		pebble: meshOf(boulder, "pebble"),
		planks: meshOf(bridge),
		chestWood: meshOf(chest, "wood"),
		chestTrim: meshOf(chest, "trim"),
		chestIron: meshOf(chest, "iron"),
		chestGold: meshOf(chest, "gold"),
	};
};

const meshOf = (gltf: GLTF, name?: string) => {
	let found: Mesh | undefined;
	gltf.scene.traverse((o) => {
		if (!found && (o as Mesh).isMesh && (!name || o.name === name))
			found = o as Mesh;
	});
	if (!found) throw new Error(`hero game: no ${name ?? "mesh"} in a model`);
	return found as Mesh & { material: MeshStandardMaterial };
};

// The fir and the boulder carry their facets in the geometry; colour is the palette's.
const FOLIAGE = new MeshStandardMaterial({
	color: chartSeries.slot4,
	roughness: 0.8,
	flatShading: true,
});
const TRUNK = new MeshStandardMaterial({ color: WOOD, roughness: 0.9 });
const CHEST_BODY = new MeshStandardMaterial({
	color: CHEST_WOOD,
	roughness: 0.85,
});
const CHEST_TRIM = new MeshStandardMaterial({
	color: amber[600],
	roughness: 0.85,
});
const IRON = new MeshStandardMaterial({
	color: neutral[700],
	metalness: 0.6,
	roughness: 0.5,
});
const GOLD = new MeshStandardMaterial({
	color: amber[400],
	emissive: amber[400],
	emissiveIntensity: 0.15,
	metalness: 0.9,
	roughness: 0.3,
});
const BOULDER = new MeshStandardMaterial({
	color: neutral[300],
	roughness: 0.9,
});

// The baked grain is near white; each tile multiplies it by its own colour.
const useTinted = (base: MeshStandardMaterial, color: Color) => {
	const hex = color.getHex();
	const material = useMemo(() => {
		const tinted = base.clone();
		tinted.color.setHex(hex);
		tinted.normalScale.setScalar(0.9);
		return tinted;
	}, [base, hex]);
	useEffect(() => () => material.dispose(), [material]);
	return material;
};

const PathPreview = ({ path, cost }: { path: Cell[]; cost: number }) => {
	const badge = useCostBadge(cost);
	const end = toWorld(path[path.length - 1]);

	return (
		<group>
			{path.slice(1, -1).map((cell) => {
				const [x, y, z] = toWorld(cell);
				return (
					<mesh key={cellKey(cell)} position={[x, y + 0.05, z]}>
						<sphereGeometry args={[0.06, 12, 12]} />
						<meshBasicMaterial color={brand[300]} />
					</mesh>
				);
			})}
			<sprite position={[end[0], end[1] + 0.75, end[2]]} scale={[0.5, 0.5, 1]}>
				<spriteMaterial map={badge} depthTest={false} />
			</sprite>
		</group>
	);
};

const useCostBadge = (cost: number) => {
	const textures = useMemo(
		() =>
			Array.from({ length: MOVE_RANGE + 1 }, (_, n) => {
				const canvas = document.createElement("canvas");
				canvas.width = canvas.height = 128;
				const ctx = canvas.getContext("2d");
				if (ctx) {
					ctx.fillStyle = brand[500];
					ctx.beginPath();
					ctx.arc(64, 64, 60, 0, Math.PI * 2);
					ctx.fill();
					ctx.fillStyle = neutral[0];
					ctx.font = "bold 72px sans-serif";
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					ctx.fillText(String(n), 64, 68);
				}
				const texture = new CanvasTexture(canvas);
				texture.colorSpace = SRGBColorSpace;
				return texture;
			}),
		[],
	);

	useEffect(
		() => () => {
			for (const t of textures) t.dispose();
		},
		[textures],
	);

	return textures[cost];
};

// The sage, built and rigged by scripts/hero-game/build-sage.py. Its rest pose
// is an A-pose with the staff hanging loose, so "idle" must always play.
const Sage = () => {
	const gltf = useLoader(GLTFLoader, "/models/hero-game/sage.glb") as GLTF;
	const sage = useMemo(() => {
		const copy = cloneSkinned(gltf.scene);
		copy.traverse((o) => {
			o.castShadow = true;
		});
		return copy;
	}, [gltf]);
	const mixer = useMemo(() => new AnimationMixer(sage), [sage]);

	useEffect(() => {
		const idle = AnimationClip.findByName(gltf.animations, "idle");
		if (idle) mixer.clipAction(idle).play();
		return () => {
			mixer.stopAllAction();
		};
	}, [gltf, mixer]);

	useFrame((_, delta) => mixer.update(delta));

	// Turned to face the camera, which looks in from the board's +x, +z corner.
	// Scaled up so he reads as a character beside the pawns and firs.
	return <primitive object={sage} rotation={[0, Math.PI / 4, 0]} scale={1.3} />;
};

const Pawn = ({
	id,
	cell,
	path,
	selected,
	onArrive,
	onPointer,
	onPick,
}: {
	id: ActorId;
	cell: Cell;
	path?: Cell[];
	selected: boolean;
	onArrive: () => void;
	onPointer?: (on: boolean) => void;
	onPick?: () => void;
}) => {
	const ref = useRef<Group>(null);
	const progress = useRef(0);
	const [hover, setHover] = useState(false);
	const walking = useRef<Cell[]>(undefined);

	useFrame((_, delta) => {
		const group = ref.current;
		if (!group || !path) return;
		if (walking.current !== path) {
			walking.current = path;
			progress.current = 0;
		}

		progress.current = Math.min(
			progress.current + delta * STEPS_PER_SECOND,
			path.length - 1,
		);
		const step = Math.min(Math.floor(progress.current), path.length - 2);
		const t = progress.current - step;
		const [ax, ay, az] = toWorld(path[step]);
		const [bx, by, bz] = toWorld(path[step + 1]);
		group.position.set(
			ax + (bx - ax) * t,
			ay + (by - ay) * t + Math.sin(t * Math.PI) * 0.15,
			az + (bz - az) * t,
		);

		if (progress.current >= path.length - 1) onArrive();
	});

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: a three.js object, not a DOM element
		<group
			ref={ref}
			position={toWorld(cell)}
			onPointerOver={(e: ThreeEvent<PointerEvent>) => {
				if (!onPointer) return;
				e.stopPropagation();
				setHover(true);
				onPointer(true);
			}}
			onPointerOut={() => {
				setHover(false);
				onPointer?.(false);
			}}
			onClick={(e: ThreeEvent<MouseEvent>) => {
				if (!onPick) return;
				e.stopPropagation();
				onPick();
			}}
		>
			{id === "sage" ? (
				<Sage />
			) : (
				<>
					<mesh position={[0, 0.05, 0]} castShadow>
						<cylinderGeometry args={[0.36, 0.38, 0.1, 32]} />
						<meshStandardMaterial color={neutral[900]} roughness={0.6} />
					</mesh>
					<mesh position={[0, 0.42, 0]} castShadow>
						<sphereGeometry args={[0.3, 32, 32]} />
						<meshStandardMaterial
							color={ACTOR_COLOR[id]}
							emissive={ACTOR_COLOR[id]}
							emissiveIntensity={id === "robot" ? 0.5 : 0.15}
							roughness={0.45}
						/>
					</mesh>
				</>
			)}
			{hover && onPick && (
				<mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
					<circleGeometry args={[0.5, 48]} />
					<meshBasicMaterial
						color={brand[400]}
						transparent
						opacity={0.45}
						depthWrite={false}
					/>
				</mesh>
			)}
			{selected && (
				<mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
					<ringGeometry args={[0.42, 0.5, 48]} />
					<meshBasicMaterial color={brand[400]} />
				</mesh>
			)}
			{(id === "sage" || id === "robot") && (
				<pointLight
					color={ACTOR_COLOR[id]}
					intensity={2.5}
					distance={2.5}
					position={[0, 0.8, 0]}
				/>
			)}
		</group>
	);
};

// The scout's money, out on the islet past the bridge.
const Chest = () => {
	// On top of its plate, which may sit a touch high: the spilled coins rest
	// on the stone instead of sinking into it.
	const [x, y, z] = toWorld({ x: 11, z: 3 });
	const { chestWood, chestTrim, chestIron, chestGold } = useModels();

	return (
		<group
			// The bake looks props up by name and gives each kind its own texture.
			name="chest"
			position={[x, y + 0.01, z]}
			rotation={[0, -Math.PI / 5, 0]}
			scale={1.4}
		>
			<mesh geometry={chestWood.geometry} material={CHEST_BODY} castShadow />
			<mesh geometry={chestTrim.geometry} material={CHEST_TRIM} castShadow />
			<mesh geometry={chestIron.geometry} material={IRON} castShadow />
			<mesh geometry={chestGold.geometry} material={GOLD} castShadow />
			<pointLight
				color={amber[400]}
				intensity={1.4}
				distance={1.8}
				position={[0, 0.6, 0.1]}
			/>
		</group>
	);
};

// Three tiers, each narrower than the one below: a fir, not a cone.
const Tree = ({ size, turn }: { size: number; turn: number }) => {
	const { foliage, trunk } = useModels();
	return (
		<group name="tree" scale={size} rotation={[0, turn, 0]}>
			<mesh geometry={foliage.geometry} material={FOLIAGE} castShadow />
			<mesh geometry={trunk.geometry} material={TRUNK} castShadow />
		</group>
	);
};

// A boulder with a pebble beside it.
const Rock = ({ size, turn }: { size: number; turn: number }) => {
	const { boulder, pebble } = useModels();
	return (
		<group name="rock" scale={size} rotation={[0, turn, 0]}>
			<mesh geometry={boulder.geometry} material={BOULDER} castShadow />
			<mesh geometry={pebble.geometry} material={BOULDER} castShadow />
		</group>
	);
};

const Bridge = ({ at }: { at: [number, number, number] }) => {
	const { planks } = useModels();
	const material = useTinted(planks.material, WOOD);
	return (
		<mesh
			geometry={planks.geometry}
			material={material}
			// Its ends rest on the neighbouring plates, which sit up to 0.03 high.
			position={[at[0], at[1] + 0.07, at[2]]}
			castShadow
			receiveShadow
		/>
	);
};
