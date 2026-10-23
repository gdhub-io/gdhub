export type Cell = { x: number; z: number };

export type ActorId =
	| "author"
	| "programmer"
	| "artist"
	| "sage"
	| "robot"
	| "scout";

export type Reach = { cost: number; path: Cell[] };

export const MOVE_RANGE = 4;

export type TileKind =
	| "ground"
	| "bare"
	| "tree"
	| "rock"
	| "bridge"
	| "islet"
	| "sign";

const KIND: Record<string, TileKind> = {
	"#": "ground",
	P: "ground",
	d: "bare",
	T: "tree",
	R: "rock",
	b: "bridge",
	i: "islet",
	S: "sign",
};

// `#` ground, `P` ground on a tall block jutting out of the edge, `d` a bare
// block with no paving, `T` tree, `R` rock, `b` bridge, `i` the islet past it,
// `S` the signpost to Steam in the woods. Only ground is walkable. Trees and
// rocks stand in groups, leaving the middle open; the rest is scenery.
const LAYOUT = [
	".TTTTdd.TT..",
	"#TTR##..TR..",
	"#######dTS..",
	"#########bii",
	"#########.ii",
	"#########...",
	"..#######...",
	"..P...P.....",
	"......P.....",
];

export const BOARD = {
	cols: LAYOUT[0].length,
	rows: LAYOUT.length,
	tiles: LAYOUT.flatMap((row, z) =>
		[...row].flatMap((ch, x) =>
			ch === "." ? [] : [{ x, z, kind: KIND[ch], tall: ch === "P" }],
		),
	),
};

export const TEAM = ["author", "programmer", "artist"] as const;
export type TeamId = (typeof TEAM)[number];

// Where each member's zone is centred; where it first stands is START.
const HOME: Record<TeamId, Cell> = {
	author: { x: 5, z: 3 },
	programmer: { x: 3, z: 2 },
	artist: { x: 4, z: 6 },
};

export const START: Record<ActorId, Cell> = {
	author: { x: 6, z: 4 },
	programmer: HOME.programmer,
	artist: { x: 6, z: 8 },
	sage: { x: 0, z: 4 },
	robot: { x: 0, z: 5 },
	scout: { x: 8, z: 3 },
};

// Each member can only ever reach one guide, so the player has to switch.
export const GUIDE: Record<TeamId, ActorId> = {
	author: "scout",
	programmer: "sage",
	artist: "robot",
};

export const cellKey = ({ x, z }: Cell) => `${x}:${z}`;

const ground = new Set(
	BOARD.tiles.filter((t) => t.kind === "ground").map((t) => cellKey(t)),
);

export const isTeam = (id: ActorId): id is TeamId =>
	(TEAM as readonly ActorId[]).includes(id);

export const neighbours = ({ x, z }: Cell): Cell[] => [
	{ x: x + 1, z },
	{ x: x - 1, z },
	{ x, z: z + 1 },
	{ x, z: z - 1 },
];

export const isBeside = (a: Cell, b: Cell) =>
	neighbours(a).some((c) => cellKey(c) === cellKey(b));

/** Every free ground cell within `range` steps of `from`, keyed by `cellKey`. */
export function reachable(
	from: Cell,
	blocked: Set<string>,
	range = MOVE_RANGE,
	allowed?: Set<string>,
): Map<string, Reach> {
	const result = new Map<string, Reach>();
	const seen = new Set([cellKey(from)]);
	let frontier: Reach[] = [{ cost: 0, path: [from] }];

	while (frontier.length && frontier[0].cost < range) {
		const next: Reach[] = [];
		for (const { cost, path } of frontier) {
			for (const cell of neighbours(path[path.length - 1])) {
				const key = cellKey(cell);
				if (
					seen.has(key) ||
					!ground.has(key) ||
					blocked.has(key) ||
					(allowed && !allowed.has(key))
				)
					continue;
				seen.add(key);
				const reach = { cost: cost + 1, path: [...path, cell] };
				result.set(key, reach);
				next.push(reach);
			}
		}
		frontier = next;
	}
	return result;
}

const guides = new Set(
	(["sage", "robot", "scout"] as const).map((id) => cellKey(START[id])),
);

/** The tiles a member may ever stand on: one move's range around its home. */
export const ZONE = Object.fromEntries(
	TEAM.map((id) => [
		id,
		new Set([cellKey(HOME[id]), ...reachable(HOME[id], guides).keys()]),
	]),
) as Record<TeamId, Set<string>>;
