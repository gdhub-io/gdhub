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
	type CSSProperties,
	memo,
	type RefObject,
	Suspense,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	AdditiveBlending,
	type AnimationAction,
	AnimationClip,
	AnimationMixer,
	BoxGeometry,
	CanvasTexture,
	Color,
	DefaultLoadingManager,
	EdgesGeometry,
	Fog,
	type Group,
	LoopOnce,
	LoopRepeat,
	type Mesh,
	MeshBasicMaterial,
	MeshStandardMaterial,
	Path,
	type PerspectiveCamera,
	PlaneGeometry,
	RingGeometry,
	Shape,
	ShapeGeometry,
	SphereGeometry,
	type Sprite,
	type SpriteMaterial,
	SRGBColorSpace,
	Vector3,
} from "three";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import {
	type GLTF,
	GLTFLoader,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { AppAvatar } from "@/components/ui/AppAvatar";
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
	type Tile,
	ZONE,
} from "./board";
import styles from "./style.module.scss";

// Handed to `.bubble` in style.module.scss as custom properties.
const BUBBLE_WIDTH = 260;
const TAIL_INSET = 30;
const TAIL_GAP = 12;
// About 38° above the board, looking from the corner.
const CAMERA: [number, number, number] = [10, 11, 10];
export const CAMERA_PROPS = { position: CAMERA, fov: 30, near: 0.1, far: 200 };
// The scout's chest, out on the islet past the bridge.
const CHEST_CELL: Cell = { x: 11, z: 3 };
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
// The tile a member is walking to: a frame round its edge.
const TILE_FRAME = (() => {
	const outer = new Shape();
	outer.moveTo(-0.46, -0.46);
	outer.lineTo(0.46, -0.46);
	outer.lineTo(0.46, 0.46);
	outer.lineTo(-0.46, 0.46);
	const hole = new Path();
	hole.moveTo(-0.39, -0.39);
	hole.lineTo(-0.39, 0.39);
	hole.lineTo(0.39, 0.39);
	hole.lineTo(0.39, -0.39);
	outer.holes.push(hole);
	return new ShapeGeometry(outer);
})();
// How high rings and highlights float over a plate: its tilt lifts an edge
// about 0.012, and anything lower is lost under the stone.
const OVERLAY = 0.035;
const TILE_EDGES = new EdgesGeometry(new PlaneGeometry(0.9, 0.9));
// Shared by every tile and pawn rather than built per mesh.
const HIT_BOX = new BoxGeometry(1, 0.66, 1);
const TILE_PLANE = new PlaneGeometry(0.9, 0.9);
const PATH_DOT = new SphereGeometry(0.07, 12, 12);
const RING_RIM = new RingGeometry(0.38, 0.54, 48);
const RING = new RingGeometry(0.41, 0.51, 48);
const HALO = new RingGeometry(0.52, 0.66, 48);
const BLOB = new PlaneGeometry(0.84, 0.84);

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
 * The board, its island drawn from island.glb with the light baked in by
 * Blender (the live, lit island it is baked from is the BakeSource story).
 */
export const HeroGame = ({
	onReady,
	onProgress,
}: {
	/** Called once every model has loaded and the first frame is drawn. */
	onReady?: () => void;
	/** Share of the models loaded so far, 0 to 1. */
	onProgress?: (share: number) => void;
}) => {
	const [meeting, setMeeting] = useState<Meeting | null>(null);
	const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
	const [selected, setSelected] = useState<TeamId>("author");
	const [ready, setReady] = useState(false);
	const root = useRef<HTMLDivElement>(null);
	const onScreen = useOnScreen(root);

	// useLoader goes through three's default manager, which counts every file.
	useEffect(() => {
		if (!onProgress) return;
		DefaultLoadingManager.onProgress = (_, loaded, total) =>
			onProgress(total ? loaded / total : 0);
		return () => {
			DefaultLoadingManager.onProgress = () => {};
		};
	}, [onProgress]);

	const close = () => {
		setMeeting(null);
		setAnchor(null);
	};

	return (
		<div className={styles.root} ref={root}>
			<Canvas
				className={styles.canvas}
				style={{ position: "absolute", inset: 0 }}
				// No shadow map: nothing here receives one, the island's are baked.
				// Never below 1.5x: on a 1x screen that supersamples the small canvas,
				// softening edges MSAA alone leaves jagged.
				dpr={[1.5, 2]}
				// Stops drawing while the hero is scrolled away or the tab is hidden.
				frameloop={onScreen ? "always" : "never"}
				camera={CAMERA_PROPS}
			>
				<FitCamera />
				<Lights />
				<Suspense fallback={null}>
					<Game
						selected={selected}
						onSelect={setSelected}
						onMeet={(m) => (m ? setMeeting(m) : close())}
					/>
					<Ready
						onReady={() => {
							setReady(true);
							onReady?.();
						}}
					/>
				</Suspense>
				{meeting && <ScreenAnchor at={meeting.at} onChange={setAnchor} />}
			</Canvas>
			<div className={styles.overlay} aria-hidden />
			<TeamPanel selected={selected} onSelect={setSelected} shown={ready} />
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

const useOnScreen = (ref: RefObject<HTMLElement | null>) => {
	const [inView, setInView] = useState(true);
	const [tabShown, setTabShown] = useState(true);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const observer = new IntersectionObserver(([entry]) =>
			setInView(entry.isIntersecting),
		);
		observer.observe(el);
		const onTab = () => setTabShown(!document.hidden);
		document.addEventListener("visibilitychange", onTab);
		return () => {
			observer.disconnect();
			document.removeEventListener("visibilitychange", onTab);
		};
	}, [ref]);
	return inView && tabShown;
};

// Mounts only once the Suspense boundary it shares with the game resolves,
// and reports after the first frame with everything in it has been drawn.
const Ready = ({ onReady }: { onReady: () => void }) => {
	const done = useRef(false);
	useFrame(() => {
		if (done.current) return;
		done.current = true;
		requestAnimationFrame(onReady);
	});
	return null;
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

const PORTRAIT: Record<ActorId, string> = {
	author: "/models/hero-game/portraits/designer.jpg",
	programmer: "/models/hero-game/portraits/programmer.jpg",
	artist: "/models/hero-game/portraits/artist.jpg",
	sage: "/models/hero-game/portraits/sage.jpg",
	robot: "/models/hero-game/portraits/robot.jpg",
	scout: "/models/hero-game/portraits/scout.jpg",
};

const useWho = (): Record<ActorId, { name: string; role: string }> => {
	const { t } = useTranslate();
	return {
		author: {
			name: t("landing.heroGame.who.author.name", "Max"),
			role: t("landing.heroGame.who.author.role", "Game designer"),
		},
		programmer: {
			name: t("landing.heroGame.who.programmer.name", "Leo"),
			role: t("landing.heroGame.who.programmer.role", "Coder"),
		},
		artist: {
			name: t("landing.heroGame.who.artist.name", "Mira"),
			role: t("landing.heroGame.who.artist.role", "Artist"),
		},
		sage: {
			name: t("landing.heroGame.who.sage.name", "Elder"),
			role: t("landing.heroGame.who.sage.role", "Industry expert"),
		},
		robot: {
			name: t("landing.heroGame.who.robot.name", "Bit"),
			role: t("landing.heroGame.who.robot.role", "AI guide"),
		},
		scout: {
			name: t("landing.heroGame.who.scout.name", "Victor"),
			role: t("landing.heroGame.who.scout.role", "Publisher & investor"),
		},
	};
};

// Top right: the team in a fixed order. The member you control opens into a
// pill with name and role; the others fold to grey discs that select them.
const TeamPanel = ({
	selected,
	onSelect,
	shown,
}: {
	selected: TeamId;
	onSelect: (id: TeamId) => void;
	/** Held back until the scene has loaded, then faded in. */
	shown: boolean;
}) => {
	const who = useWho();
	return (
		<Flex
			className={`${styles.team} ${shown ? styles.teamShown : ""}`}
			gap="small"
			align="center"
		>
			{TEAM.map((id) => {
				const active = id === selected;
				return (
					<Button
						key={id}
						type="text"
						className={`${styles.member} ${active ? styles.memberActive : ""}`}
						aria-label={who[id].name}
						aria-pressed={active}
						onClick={() => onSelect(id)}
					>
						<AppAvatar
							src={PORTRAIT[id]}
							size={36}
							className={styles.memberPortrait}
						/>
						<span className={styles.memberLabel}>
							<Typography.Text strong className={styles.speakerName}>
								{who[id].name}
							</Typography.Text>
							<Typography.Text type="secondary" className={styles.speakerRole}>
								{who[id].role}
							</Typography.Text>
						</span>
					</Button>
				);
			})}
		</Flex>
	);
};

// Types a line out letter by letter. The rest is laid out but invisible, so
// the bubble keeps its size while it fills.
const Typed = ({ text }: { text: string }) => {
	const [shown, setShown] = useState(0);
	useEffect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			setShown(text.length);
			return;
		}
		setShown(0);
		const timer = setInterval(
			() =>
				setShown((n) => {
					if (n >= text.length) clearInterval(timer);
					return Math.min(n + 1, text.length);
				}),
			TYPE_MS,
		);
		return () => clearInterval(timer);
	}, [text]);
	return (
		<>
			{text.slice(0, shown)}
			<span className={styles.untyped}>{text.slice(shown)}</span>
		</>
	);
};

const TYPE_MS = 28;

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

	// The one approached speaks; the button is the answer of the member who came.
	// Each pair has a few lines, one picked at random per meeting; teammates also
	// share the stock lines of any team.
	const pool: Partial<
		Record<`${ActorId}>${TeamId}`, { line: string; accept: string }[]>
	> = {
		"scout>author": [
			{
				line: t(
					"landing.heroGame.dialogue.scoutToAuthor1",
					"There'll be a build — there'll be money.",
				),
				accept: t("landing.heroGame.dialogue.scoutToAuthor1Accept", "Deal"),
			},
			{
				line: t(
					"landing.heroGame.dialogue.scoutToAuthor2",
					"No money, and don't ask.",
				),
				accept: t(
					"landing.heroGame.dialogue.scoutToAuthor2Accept",
					"Fair enough",
				),
			},
			{
				line: t(
					"landing.heroGame.dialogue.scoutToAuthor3",
					"I've seen your game. We need to talk.",
				),
				accept: t(
					"landing.heroGame.dialogue.scoutToAuthor3Accept",
					"Let's talk",
				),
			},
		],
		"robot>artist": [
			{
				line: t(
					"landing.heroGame.dialogue.robotToArtist1",
					"Creativity is great, but deadlines exist for a reason.",
				),
				accept: t("landing.heroGame.dialogue.robotToArtist1Accept", "Got it"),
			},
			{
				line: t(
					"landing.heroGame.dialogue.robotToArtist2",
					"Saw the new art. It's coming along nicely.",
				),
				accept: t("landing.heroGame.dialogue.robotToArtist2Accept", "Thanks!"),
			},
			{
				line: t(
					"landing.heroGame.dialogue.robotToArtist3",
					"Time is short. Cut the number of characters?",
				),
				accept: t("landing.heroGame.dialogue.robotToArtist3Accept", "Never"),
			},
		],
		"sage>programmer": [
			{
				line: t(
					"landing.heroGame.dialogue.sageToProgrammer1",
					"Saw the new prototype. Hard to put down.",
				),
				accept: t(
					"landing.heroGame.dialogue.sageToProgrammer1Accept",
					"Thank you",
				),
			},
			{
				line: t(
					"landing.heroGame.dialogue.sageToProgrammer2",
					"Do you write anything yourself, or does Claude do it all?",
				),
				accept: t(
					"landing.heroGame.dialogue.sageToProgrammer2Accept",
					"We pair",
				),
			},
			{
				line: t(
					"landing.heroGame.dialogue.sageToProgrammer3",
					"Looked at your changes. Refactor, and refactor again.",
				),
				accept: t("landing.heroGame.dialogue.sageToProgrammer3Accept", "On it"),
			},
		],
		"author>artist": [
			{
				line: t(
					"landing.heroGame.dialogue.authorToArtist1",
					"We need to redraw everything. Can you make it by tomorrow?",
				),
				accept: t("landing.heroGame.dialogue.authorToArtist1Accept", "Sure…"),
			},
			{
				line: t(
					"landing.heroGame.dialogue.authorToArtist2",
					"Can the hero look more… heroic? You know what I mean.",
				),
				accept: t(
					"landing.heroGame.dialogue.authorToArtist2Accept",
					"Not really",
				),
			},
			{
				line: t(
					"landing.heroGame.dialogue.authorToArtist3",
					"Players say it's too dark. Brighten it up a little?",
				),
				accept: t("landing.heroGame.dialogue.authorToArtist3Accept", "Will do"),
			},
		],
		"artist>author": [
			{
				line: t(
					"landing.heroGame.dialogue.artistToAuthor1",
					"The character's story is strong — I cried at the end.",
				),
				accept: t(
					"landing.heroGame.dialogue.artistToAuthor1Accept",
					"Thank you",
				),
			},
			{
				line: t(
					"landing.heroGame.dialogue.artistToAuthor2",
					"Describe the character for me — I don't know where to start.",
				),
				accept: t(
					"landing.heroGame.dialogue.artistToAuthor2Accept",
					"Here's the brief",
				),
			},
			{
				line: t(
					"landing.heroGame.dialogue.artistToAuthor3",
					"The concept's done. You can hand it to the 3D artist.",
				),
				accept: t(
					"landing.heroGame.dialogue.artistToAuthor3Accept",
					"Sending it",
				),
			},
		],
		"author>programmer": [
			{
				line: t(
					"landing.heroGame.dialogue.authorToProgrammer1",
					"Is the new mechanic in yet?",
				),
				accept: t(
					"landing.heroGame.dialogue.authorToProgrammer1Accept",
					"Almost",
				),
			},
			{
				line: t(
					"landing.heroGame.dialogue.authorToProgrammer2",
					"I think we should make a platformer — but first-person.",
				),
				accept: t(
					"landing.heroGame.dialogue.authorToProgrammer2Accept",
					"Why?",
				),
			},
			{
				line: t(
					"landing.heroGame.dialogue.authorToProgrammer3",
					"I opened the game's code… and closed it. How do you work with that?",
				),
				accept: t(
					"landing.heroGame.dialogue.authorToProgrammer3Accept",
					"Carefully",
				),
			},
		],
		"programmer>author": [
			{
				line: t(
					"landing.heroGame.dialogue.programmerToAuthor1",
					"Yes, yes, I remember — the level is almost built.",
				),
				accept: t(
					"landing.heroGame.dialogue.programmerToAuthor1Accept",
					"Good",
				),
			},
			{
				line: t(
					"landing.heroGame.dialogue.programmerToAuthor2",
					"Why do we need an artist? I'll generate it all.",
				),
				accept: t("landing.heroGame.dialogue.programmerToAuthor2Accept", "No"),
			},
			{
				line: t(
					"landing.heroGame.dialogue.programmerToAuthor3",
					"Let's drop combat. It just won't come together.",
				),
				accept: t(
					"landing.heroGame.dialogue.programmerToAuthor3Accept",
					"Let's talk",
				),
			},
		],
		"artist>programmer": [
			{
				line: t(
					"landing.heroGame.dialogue.artistToProgrammer1",
					"Make the button a bit softer — something players will enjoy.",
				),
				accept: t(
					"landing.heroGame.dialogue.artistToProgrammer1Accept",
					"Softer how?",
				),
			},
			{
				line: t(
					"landing.heroGame.dialogue.artistToProgrammer2",
					"That's not the colour I gave you.",
				),
				accept: t(
					"landing.heroGame.dialogue.artistToProgrammer2Accept",
					"It's close",
				),
			},
			{
				line: t(
					"landing.heroGame.dialogue.artistToProgrammer3",
					"Can the character blink? Just a little.",
				),
				accept: t(
					"landing.heroGame.dialogue.artistToProgrammer3Accept",
					"Sure",
				),
			},
		],
		"programmer>artist": [
			{
				line: t(
					"landing.heroGame.dialogue.programmerToArtist1",
					"The sprite sheet is off by a pixel again.",
				),
				accept: t(
					"landing.heroGame.dialogue.programmerToArtist1Accept",
					"Fixing it",
				),
			},
			{
				line: t(
					"landing.heroGame.dialogue.programmerToArtist2",
					"It looks great — but it weighs 80 MB.",
				),
				accept: t(
					"landing.heroGame.dialogue.programmerToArtist2Accept",
					"I'll compress",
				),
			},
			{
				line: t(
					"landing.heroGame.dialogue.programmerToArtist3",
					"Do we really need twelve frames for a blink?",
				),
				accept: t("landing.heroGame.dialogue.programmerToArtist3Accept", "Yes"),
			},
		],
	};
	const anyTeam = [
		{
			line: t("landing.heroGame.dialogue.team1", "So? Anything yet?"),
			accept: t("landing.heroGame.dialogue.team1Accept", "Not yet"),
		},
		{
			line: t(
				"landing.heroGame.dialogue.team2",
				'Is it done? It\'s been "almost done" all week.',
			),
			accept: t("landing.heroGame.dialogue.team2Accept", "Almost"),
		},
		{
			line: t(
				"landing.heroGame.dialogue.team3",
				"Did you push it? I don't see it in the build.",
			),
			accept: t("landing.heroGame.dialogue.team3Accept", "Pushing now"),
		},
		{
			line: t("landing.heroGame.dialogue.team4", "Standup in five minutes."),
			accept: t("landing.heroGame.dialogue.team4Accept", "Coming"),
		},
	];
	const who = useWho();
	const [[coin, roll]] = useState(() => [Math.random(), Math.random()]);
	const own = pool[`${meeting.speaker}>${meeting.listener}`] ?? [];
	// Between teammates: half the time the pair's own lines, half a stock one.
	const options =
		isTeam(meeting.speaker) && (coin < 0.5 || !own.length) ? anyTeam : own;
	const said = options[Math.floor(roll * options.length)];
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
			styles={{
				container: {
					"--bubble-width": `${BUBBLE_WIDTH}px`,
					"--tail-inset": `${TAIL_INSET}px`,
				} as CSSProperties,
			}}
			content={
				// The game's UI keeps product-sized controls inside the marketing page.
				<InverseBand density="product" transparent>
					<Flex vertical gap="small">
						<Flex gap="small" align="center">
							<AppAvatar
								src={PORTRAIT[meeting.speaker]}
								size={28}
								className={styles.speakerPortrait}
							/>
							<Flex vertical>
								<Typography.Text strong className={styles.speakerName}>
									{who[meeting.speaker].name}
								</Typography.Text>
								<Typography.Text
									type="secondary"
									className={styles.speakerRole}
								>
									{who[meeting.speaker].role}
								</Typography.Text>
							</Flex>
						</Flex>
						<Typography.Text className={styles.line}>
							<Typed text={line} />
						</Typography.Text>
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
	const scene = useThree((s) => s.scene);

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
		// Starts just behind the island's centre, so the near side stays crisp
		// and the far rows and trees sink into the section's background.
		scene.fog = new Fog(neutral[950], distance, distance + 8);
	}, [camera, size, scene]);

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
			{/* Named: scripts/hero-game/bake-island.py finds each light by name. */}
			<ambientLight intensity={0.85} />
			<directionalLight
				name="sun"
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
				name="warm"
				color={amber[400]}
				position={[wx, 1.4, wz]}
				intensity={14}
				distance={7}
				decay={1.6}
			/>
			<pointLight
				name="cold"
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

// A texture drawn once on a 2D canvas and kept for the page's life: each is
// small and shared by everything that shows it.
const canvasTexture = (
	width: number,
	height: number,
	draw: (ctx: CanvasRenderingContext2D) => void,
) => {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (ctx) draw(ctx);
	const texture = new CanvasTexture(canvas);
	texture.colorSpace = SRGBColorSpace;
	return texture;
};

const once = <T,>(make: () => T) => {
	let value: T | undefined;
	return () => {
		value ??= make();
		return value;
	};
};

// A soft round spot in one colour, fading to nothing at the edge.
const glowTexture = (color: string, stops: [number, number][]) =>
	canvasTexture(256, 256, (ctx) => {
		const { r, g, b } = new Color(color);
		const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
		for (const [at, alpha] of stops)
			gradient.addColorStop(
				at,
				`rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`,
			);
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, 256, 256);
	});

const glowOf = new Map<string, CanvasTexture>();
const glow = (color: string) => {
	let texture = glowOf.get(color);
	if (!texture) {
		texture = glowTexture(color, [
			[0, 0.9],
			[0.4, 0.35],
			[1, 0],
		]);
		glowOf.set(color, texture);
	}
	return texture;
};

const blobTexture = once(() =>
	glowTexture(neutral[950], [
		[0, 0.8],
		[0.55, 0.45],
		[1, 0],
	]),
);

const steamLabel = once(() =>
	canvasTexture(256, 96, (ctx) => {
		ctx.fillStyle = neutral[0];
		ctx.font = "bold 66px sans-serif";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("STEAM", 128, 52);
	}),
);

const costBadges = once(() =>
	Array.from({ length: MOVE_RANGE + 1 }, (_, n) =>
		canvasTexture(128, 128, (ctx) => {
			ctx.fillStyle = brand[500];
			ctx.beginPath();
			ctx.arc(64, 64, 60, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = neutral[0];
			ctx.font = "bold 72px sans-serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(String(n), 64, 68);
		}),
	),
);

// The baked coins don't catch light, so their shine is drawn live on top: a
// warm glow that breathes, and a few sparkles that flare in turn.
const GoldShimmer = memo(() => {
	const [x, y, z] = toWorld(CHEST_CELL);
	const halo = useRef<SpriteMaterial>(null);
	const sparks = useRef<(Sprite | null)[]>([]);

	useFrame(({ clock }) => {
		const t = clock.getElapsedTime();
		if (halo.current) halo.current.opacity = 0.35 + Math.sin(t * 1.6) * 0.15;
		sparks.current.forEach((sprite, i) => {
			if (!sprite) return;
			// Each flares for a moment once per 2.4 s, offset from the others.
			const phase = (t / 2.4 + i * 0.29) % 1;
			const flare = Math.max(0, Math.sin(Math.min(phase / 0.18, 1) * Math.PI));
			sprite.scale.setScalar(0.04 + flare * 0.12);
			(sprite.material as SpriteMaterial).opacity = flare;
		});
	});

	return (
		<group position={[x, y + 0.48, z]}>
			<sprite scale={[0.9, 0.7, 1]} raycast={ignoreRay}>
				<spriteMaterial
					ref={halo}
					map={glow(amber[400])}
					transparent
					depthWrite={false}
					blending={AdditiveBlending}
				/>
			</sprite>
			{SPARKS.map((at, i) => (
				<sprite
					key={at.join()}
					ref={(s) => {
						sparks.current[i] = s;
					}}
					position={at}
					raycast={ignoreRay}
				>
					<spriteMaterial
						map={glow(neutral[0])}
						transparent
						depthWrite={false}
						depthTest={false}
						blending={AdditiveBlending}
					/>
				</sprite>
			))}
		</group>
	);
});

// Points into the woods behind: the way to Steam, where the game is released.
const SIGN = BOARD.tiles.find((t) => t.kind === "sign");

const Signpost = memo(() => {
	if (!SIGN) return null;
	const [x, y, z] = toWorld(SIGN);

	return (
		// Turned so the board faces the camera; the arrow points right, into the woods.
		<group position={[x, y, z]} rotation={[0, Math.PI / 4, 0]}>
			<mesh position={[0, 0.4, 0]} castShadow>
				<cylinderGeometry args={[0.04, 0.05, 0.8, 8]} />
				<meshStandardMaterial color={WOOD} roughness={0.9} />
			</mesh>
			<group position={[0.08, 0.66, 0.05]} rotation={[0, 0, -0.06]}>
				<mesh castShadow>
					<boxGeometry args={[0.72, 0.24, 0.05]} />
					<meshStandardMaterial color={CHEST_WOOD} roughness={0.85} />
				</mesh>
				<mesh position={[0.36, 0, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
					<boxGeometry args={[0.17, 0.17, 0.05]} />
					<meshStandardMaterial color={CHEST_WOOD} roughness={0.85} />
				</mesh>
				<mesh position={[0, 0, 0.026]} raycast={ignoreRay}>
					<planeGeometry args={[0.64, 0.22]} />
					<meshBasicMaterial
						map={steamLabel()}
						transparent
						toneMapped={false}
					/>
				</mesh>
			</group>
		</group>
	);
});

const SPARKS: [number, number, number][] = [
	[-0.12, 0.04, 0.05],
	[0.1, 0.08, -0.04],
	[0.02, 0.12, 0.1],
	[-0.04, 0.02, -0.12],
];

// The cold light made visible: a soft halo in the dark behind the island.
const Glow = ({
	at,
	color,
}: {
	at: [number, number, number];
	color: string;
}) => {
	return (
		<sprite
			position={at}
			scale={[11, 8, 1]}
			renderOrder={-1}
			raycast={ignoreRay}
		>
			<spriteMaterial
				map={glow(color)}
				transparent
				depthWrite={false}
				// The cold light is the far edge itself; fog must not put it out.
				fog={false}
				blending={AdditiveBlending}
				opacity={0.95}
			/>
		</sprite>
	);
};

type Move = { id: TeamId; path: Cell[] };

type Meeting = { speaker: ActorId; listener: TeamId; at: Cell };

const Game = ({
	selected,
	onSelect: setSelected,
	onMeet,
}: {
	selected: TeamId;
	onSelect: (id: TeamId) => void;
	onMeet: (meeting: Meeting | null) => void;
}) => {
	const [positions, setPositions] = useState(START);
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
	const destination = move ? cellKey(move.path[move.path.length - 1]) : null;
	// A member's own tile answers the pointer as the member does.
	const standing = hovered
		? (Object.keys(positions) as ActorId[]).find(
				(id) => cellKey(positions[id]) === hovered,
			)
		: undefined;
	const teammateUnder = standing && !move && isTeam(standing) ? standing : null;

	useEffect(() => {
		gl.domElement.style.cursor =
			target || pointerOnPawn || teammateUnder ? "pointer" : "";
	}, [gl, target, pointerOnPawn, teammateUnder]);

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

	const tileState = (key: string): TileState => {
		if (key === destination) return "destination";
		if (!targets.has(key)) return "idle";
		return key === hovered ? "hovered" : "reachable";
	};

	// One stable set of tile handlers reading the latest state through a ref, so
	// a hover re-renders only the tiles whose state changed.
	const latest = useRef({ go, teammateUnder, hovered, setSelected });
	latest.current = { go, teammateUnder, hovered, setSelected };
	const tileHandlers = useMemo<TileHandlers>(
		() => ({
			over: (key) => setHovered(key),
			out: (key) => setHovered((h) => (h === key ? null : h)),
			pick: (key) => {
				const { go, teammateUnder, hovered, setSelected } = latest.current;
				if (teammateUnder && key === hovered) setSelected(teammateUnder);
				else go(key);
			},
		}),
		[],
	);

	return (
		<group>
			{BOARD.tiles.map((tile) => {
				const key = cellKey(tile);
				return (
					<TileHit
						key={key}
						tileKey={key}
						cell={tile}
						state={tileState(key)}
						handlers={tileHandlers}
					/>
				);
			})}

			{target && target.cost > 0 && (
				<PathPreview
					path={target.path}
					cost={target.cost}
					// Aiming at a guide: the walk ends beside him, so no dot under him.
					lastDot={hovered !== guideKey}
				/>
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
						tileHovered={standing === id}
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

			<BakedIsland />
			<GoldShimmer />
			<Signpost />
		</group>
	);
};

/** Everything that never moves: the stone, the firs and rocks, the bridge, the chest. */
export const Island = () => (
	<group name="island">
		{BOARD.tiles.map((tile) =>
			tile.kind === "bridge" ? (
				<Bridge key={cellKey(tile)} at={toWorld(tile)} />
			) : (
				<Stone key={cellKey(tile)} tile={tile} />
			),
		)}
		<Chest />
	</group>
);

// The shipped models are meshopt-compressed by scripts/hero-game/optimize.mjs.
const withMeshopt = (loader: GLTFLoader) => {
	loader.setMeshoptDecoder(MeshoptDecoder);
};

// The island with its light baked in by scripts/hero-game/bake-island.py: one
// mesh, one texture, no lighting to compute.
const BakedIsland = memo(() => {
	const gltf = useLoader(
		GLTFLoader,
		"/models/hero-game/island.glb",
		withMeshopt,
	) as GLTF;
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
});

type TileState = "idle" | "reachable" | "hovered" | "destination";
type TileHandlers = Record<"over" | "out" | "pick", (key: string) => void>;

// Where the pointer lands on a cell: an invisible box, plus the move highlight.
const TileHit = memo(
	({
		tileKey,
		cell,
		state,
		handlers,
	}: {
		tileKey: string;
		cell: Cell;
		state: TileState;
		handlers: TileHandlers;
	}) => {
		const [x, , z] = toWorld(cell);
		const over: [number, number, number] = [0, lift(cell) + OVERLAY, 0];
		return (
			// biome-ignore lint/a11y/noStaticElementInteractions: a three.js object, not a DOM element
			<group
				position={[x, 0, z]}
				onPointerOver={(e: ThreeEvent<PointerEvent>) => {
					e.stopPropagation();
					handlers.over(tileKey);
				}}
				onPointerOut={() => handlers.out(tileKey)}
				onClick={(e: ThreeEvent<MouseEvent>) => {
					e.stopPropagation();
					handlers.pick(tileKey);
				}}
			>
				<mesh geometry={HIT_BOX} position={[0, -0.3, 0]}>
					<meshBasicMaterial visible={false} />
				</mesh>
				{state === "destination" && (
					<mesh
						geometry={TILE_FRAME}
						position={over}
						rotation={[-Math.PI / 2, 0, 0]}
						raycast={ignoreRay}
					>
						<meshBasicMaterial color={brand[400]} />
					</mesh>
				)}
				{(state === "reachable" || state === "hovered") && (
					<group position={over} rotation={[-Math.PI / 2, 0, 0]}>
						<mesh geometry={TILE_PLANE} raycast={ignoreRay}>
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
	},
);

const Stone = ({ tile }: { tile: Tile }) => {
	const { kind } = tile;
	const [x, , z] = toWorld(tile);
	const depth = depthOf(tile);
	const paved = kind === "ground" || kind === "islet" || kind === "sign";
	const stone = useModels();
	const plateMaterial = useTinted(stone.plate.material, plateColor(tile));
	const blockMaterial = useTinted(
		stone.block.material,
		paved ? PAVED_BLOCK : BARE_BLOCK,
	);

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
					position={[0, -PLATE / 2 + lift(tile), 0]}
					rotation={[
						noise(tile, 2) * 0.025,
						// A quarter turn per plate, so the chipped edges never repeat.
						Math.floor(shade(tile) * 4) * (Math.PI / 2) + noise(tile, 3) * 0.06,
						noise(tile, 4) * 0.025,
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
						size={1.3 + shade(tile) * 0.8}
						turn={noise(tile, 5) * Math.PI}
					/>
				)}
				{kind === "rock" && (
					<Rock
						size={1.5 + shade(tile) * 0.5}
						turn={noise(tile, 6) * Math.PI}
					/>
				)}
			</group>
		</group>
	);
};

// Built by scripts/hero-game/build-models.py: bevelled stone with baked grain
// and chips, a faceted fir and a boulder.
const useModels = () => {
	const loaded = useLoader(GLTFLoader, [
		"/models/hero-game/plate.glb",
		"/models/hero-game/block.glb",
		"/models/hero-game/fir.glb",
		"/models/hero-game/boulder.glb",
		"/models/hero-game/bridge.glb",
		"/models/hero-game/chest.glb",
	]) as GLTF[];
	// Picked out once per load: every tile and prop asks for these.
	let models = modelsOf.get(loaded[0]);
	if (!models) {
		models = pickMeshes(loaded);
		modelsOf.set(loaded[0], models);
	}
	return models;
};

const pickMeshes = ([plate, block, fir, boulder, bridge, chest]: GLTF[]) => {
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

const modelsOf = new WeakMap<GLTF, ReturnType<typeof pickMeshes>>();

const PAVED_BLOCK = new Color(neutral[900]);
const BARE_BLOCK = new Color(neutral[800]);

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
	// The bake gives this material its glow by name.
	name: "gold",
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

const PathPreview = ({
	path,
	cost,
	lastDot,
}: {
	path: Cell[];
	cost: number;
	lastDot: boolean;
}) => {
	const end = toWorld(path[path.length - 1]);

	return (
		<group>
			{path.slice(1, lastDot ? undefined : -1).map((cell) => {
				const [x, y, z] = toWorld(cell);
				return (
					<mesh
						key={cellKey(cell)}
						geometry={PATH_DOT}
						position={[x, y + 0.05, z]}
					>
						<meshBasicMaterial color={neutral[950]} transparent opacity={0.5} />
					</mesh>
				);
			})}
			<sprite position={[end[0], end[1] + 0.75, end[2]]} scale={[0.5, 0.5, 1]}>
				<spriteMaterial map={costBadges()[cost]} depthTest={false} />
			</sprite>
		</group>
	);
};

type CharacterModel = {
	url: string;
	/** What he does most of the time, and comes back to after anything else. */
	rest: string;
	/** Played now and then instead of the rest idle. */
	extras: string[];
	/** Which way he faces standing; the camera unless set. */
	facing?: number;
	/** A soft light of this colour round him. */
	glow?: string;
};

// Rigged characters, built by scripts/hero-game/build-<name>.py. Every rest
// pose is an A-pose, so an animation must always be playing. All idles share
// their first and last pose; `walk` plays in place while the pawn moves.
const MODELS: Record<ActorId, CharacterModel> = {
	sage: {
		url: "/models/hero-game/sage.glb",
		rest: "idle_breathe",
		extras: ["idle_look", "idle_beard"],
		glow: amber[400],
	},
	author: {
		url: "/models/hero-game/designer.glb",
		rest: "idle_breathe",
		extras: ["idle_lantern", "idle_think"],
	},
	programmer: {
		url: "/models/hero-game/programmer.glb",
		rest: "idle_breathe",
		extras: ["idle_glasses", "idle_music"],
	},
	robot: {
		url: "/models/hero-game/robot.glb",
		rest: "idle_breathe",
		extras: ["idle_scan", "idle_wave"],
		glow: chartSeries.slot6,
	},
	artist: {
		url: "/models/hero-game/artist.glb",
		rest: "idle_breathe",
		extras: ["idle_paint", "idle_beret"],
	},
	scout: {
		url: "/models/hero-game/scout.glb",
		rest: "idle_breathe",
		extras: ["idle_tie", "idle_watch"],
		// A quarter turn round, towards the team across the board.
		facing: 0,
	},
};

const IDLE_FADE = 0.5;
// The camera looks in from the board's +x, +z corner.
const FACE_CAMERA = Math.PI / 4;
const WALK_FADE = 0.2;
const WALK_STEPS_PER_SECOND = 1.8;
// The walk is played faster than authored so the feet keep up with the board
// and don't skate.
const WALK_TEMPO = 1.8;

// Mostly the rest idle; now and then one of the extras, then back to rest.
const nextIdle = (model: CharacterModel, last: string) =>
	last !== model.rest || Math.random() > 0.25
		? model.rest
		: model.extras[Math.floor(Math.random() * model.extras.length)];

const Character = ({
	model,
	walking,
}: {
	model: CharacterModel;
	walking: boolean;
}) => {
	const gltf = useLoader(GLTFLoader, model.url, withMeshopt) as GLTF;
	// No cast shadow: the sun's is hard-edged; a soft blob sits under him.
	// Characters stay out of the fog, which is for the far edge of the land.
	const body = useMemo(() => {
		const copy = cloneSkinned(gltf.scene);
		copy.traverse((o) => {
			const mesh = o as Mesh;
			if (mesh.isMesh) (mesh.material as MeshStandardMaterial).fog = false;
		});
		return copy;
	}, [gltf]);
	const mixer = useMemo(() => new AnimationMixer(body), [body]);
	const current = useRef<AnimationAction | null>(null);
	const queued = useRef<string | null>(null);

	const play = (name: string, fade = IDLE_FADE) => {
		const clip = AnimationClip.findByName(gltf.animations, name);
		if (!clip) return;
		const next = mixer.clipAction(clip);
		next.reset();
		next.timeScale = name === "walk" ? WALK_TEMPO : 1;
		if (name === "walk") next.setLoop(LoopRepeat, Number.POSITIVE_INFINITY);
		else {
			next.setLoop(LoopOnce, 1);
			next.clampWhenFinished = true;
		}
		next.play();
		if (current.current && current.current !== next)
			current.current.crossFadeTo(next, fade, false);
		current.current = next;
		queued.current = null;
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: reacts to walking only
	useEffect(() => {
		play(walking ? "walk" : model.rest, WALK_FADE);
	}, [walking, mixer]);

	useEffect(
		() => () => {
			mixer.stopAllAction();
		},
		[mixer],
	);

	useFrame((_, delta) => {
		mixer.update(delta);
		const action = current.current;
		if (walking || !action) return;
		const clip = action.getClip();
		// Picked once, as the clip nears its end: a different idle crossfades
		// in, the same one simply starts over once this pass has finished —
		// restarting it early would snap the pose back.
		if (queued.current === null && action.time >= clip.duration - IDLE_FADE) {
			const next = nextIdle(model, clip.name);
			if (next !== clip.name) play(next);
			else queued.current = next;
		} else if (queued.current !== null && action.time >= clip.duration)
			play(queued.current);
	});

	// Scaled up so he reads as a character beside the pawns and firs.
	return (
		<>
			<BlobShadow />
			<primitive object={body} scale={1.3} />
		</>
	);
};

// A soft dark spot on the plate, fading to nothing at the edge.
const BlobShadow = () => (
	<mesh
		geometry={BLOB}
		position={[0, OVERLAY - 0.004, 0]}
		rotation={[-Math.PI / 2, 0, 0]}
		raycast={ignoreRay}
	>
		<meshBasicMaterial map={blobTexture()} transparent depthWrite={false} />
	</mesh>
);

// A small cone over the selected member, bobbing and turning slowly.
const SelectionMarker = () => {
	const height = 1.45;
	const ref = useRef<Mesh>(null);
	useFrame(({ clock }) => {
		const marker = ref.current;
		if (!marker) return;
		const t = clock.getElapsedTime();
		marker.position.y = height + Math.sin(t * 2.4) * 0.06;
		marker.rotation.y = t * 0.8;
	});
	return (
		// Flipped so the tip points down at him.
		<mesh
			ref={ref}
			position={[0, height, 0]}
			rotation={[Math.PI, 0, 0]}
			raycast={ignoreRay}
		>
			<coneGeometry args={[0.1, 0.2, 4]} />
			<meshStandardMaterial
				color={neutral[0]}
				emissive={neutral[0]}
				emissiveIntensity={0.35}
				roughness={0.4}
				transparent
				opacity={0.75}
				flatShading
			/>
		</mesh>
	);
};

const Pawn = ({
	id,
	cell,
	path,
	selected,
	onArrive,
	onPointer,
	onPick,
	tileHovered,
}: {
	id: ActorId;
	cell: Cell;
	path?: Cell[];
	selected: boolean;
	onArrive: () => void;
	onPointer?: (on: boolean) => void;
	onPick?: () => void;
	/** The pointer is on his tile rather than on him. */
	tileHovered?: boolean;
}) => {
	const ref = useRef<Group>(null);
	const heading = useRef<Group>(null);
	const progress = useRef(0);
	const [hover, setHover] = useState(false);
	const walking = useRef<Cell[]>(undefined);
	const model = MODELS[id];
	const team = isTeam(id);

	// Faces where he walks, and turns back to rest once he stops.
	const rest = model.facing ?? FACE_CAMERA;
	const facing = useRef(rest);

	useFrame((_, delta) => {
		if (heading.current) {
			const turn =
				((facing.current - heading.current.rotation.y + Math.PI * 3) %
					(Math.PI * 2)) -
				Math.PI;
			heading.current.rotation.y += turn * Math.min(1, delta * 10);
		}
		const group = ref.current;
		if (!group || !path) return;
		if (walking.current !== path) {
			walking.current = path;
			progress.current = 0;
		}

		progress.current = Math.min(
			progress.current + delta * WALK_STEPS_PER_SECOND,
			path.length - 1,
		);
		const step = Math.min(Math.floor(progress.current), path.length - 2);
		const t = progress.current - step;
		const [ax, ay, az] = toWorld(path[step]);
		const [bx, by, bz] = toWorld(path[step + 1]);
		group.position.set(
			ax + (bx - ax) * t,
			ay + (by - ay) * t,
			az + (bz - az) * t,
		);
		// The models face +z.
		facing.current = Math.atan2(bx - ax, bz - az);

		if (progress.current >= path.length - 1) {
			facing.current = rest;
			onArrive();
		}
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
			<group ref={heading} rotation={[0, rest, 0]}>
				<Character model={model} walking={!!path} />
			</group>
			{(hover || tileHovered) && onPick && team && (
				// A halo just outside the ring: inside it, the blob shadow would
				// cover it.
				<mesh
					geometry={HALO}
					position={[0, OVERLAY + 0.002, 0]}
					rotation={[-Math.PI / 2, 0, 0]}
					raycast={ignoreRay}
				>
					<meshBasicMaterial
						color={neutral[0]}
						transparent
						opacity={0.6}
						depthWrite={false}
					/>
				</mesh>
			)}
			{selected && <SelectionMarker />}
			{team && (
				// A dark rim keeps the ring readable on light stone and on the
				// coral move highlight alike.
				<group position={[0, OVERLAY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
					<mesh geometry={RING_RIM} raycast={ignoreRay}>
						<meshBasicMaterial
							color={neutral[950]}
							transparent
							opacity={0.55}
							depthWrite={false}
						/>
					</mesh>
					<mesh geometry={RING} position={[0, 0, 0.001]} raycast={ignoreRay}>
						<meshBasicMaterial
							color={selected ? brand[500] : neutral[100]}
							depthWrite={false}
							transparent
						/>
					</mesh>
				</group>
			)}
			{model.glow && (
				<pointLight
					color={model.glow}
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
	const [x, y, z] = toWorld(CHEST_CELL);
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
				name="chest"
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
