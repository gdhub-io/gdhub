import type {
	DailyStartStreamingCustomLayoutConfig,
	DailyStreamingParticipantsConfig,
	DailyUpdateStreamingCustomLayoutConfig,
} from "@daily-co/daily-js";
import { brand, directionColors } from "@/config/design/tokens";
import { SBORKA_SPEAKER_FRAME_MIN } from "@/config/live";

/**
 * What the host has decided, shared with everyone in the room through Daily's
 * meeting session data. Sources are keyed by session id; a shared screen is
 * `<sessionId>:screen` and always travels with its owner in `order`.
 */
export type SborkaDirection = {
	/** Session ids, top to bottom in the guests list = left to right on air. */
	order: string[];
	/** Source keys on the broadcast. */
	onScreen: string[];
	title: string;
};

export const screenKey = (sessionId: string) => `${sessionId}:screen`;

/** The direction everyone sees before the host has touched anything. */
export const EMPTY_DIRECTION: SborkaDirection = {
	order: [],
	onScreen: [],
	title: "",
};

/** The host's order, minus who left, plus newcomers in the order they joined. */
export const peopleInOrder = (order: string[], present: string[]) => [
	...order.filter((id) => present.includes(id)),
	...present.filter((id) => !order.includes(id)),
];

/** Rows of the broadcast grid: ⌈√n⌉ columns, every row full but the last. */
export const gridRows = (count: number) => {
	if (count <= 0) return [];
	const cols = Math.ceil(Math.sqrt(count));
	const rows = Math.ceil(count / cols);
	return Array.from({ length: rows }, (_, row) =>
		row < rows - 1 ? cols : count - cols * (rows - 1),
	);
};

/** The sources on air, in the host's order; a screen right after its owner. */
export const sourcesOnAir = (
	direction: SborkaDirection,
	present: string[],
	sharing: string[],
) =>
	peopleInOrder(direction.order, present).flatMap((id) =>
		[id, ...(sharing.includes(id) ? [screenKey(id)] : [])].filter((key) =>
			direction.onScreen.includes(key),
		),
	);

export const showsSpeakerFrame = (camerasOnAir: number) =>
	camerasOnAir >= SBORKA_SPEAKER_FRAME_MIN;

/** One person as the composition draws them: label and rail direction. */
export type SborkaPerson = {
	name: string;
	role: string;
	/** Direction slug; `host` for whoever runs the show. */
	direction: string;
};

type LayoutInput = {
	sources: string[];
	people: Record<string, SborkaPerson>;
	title: string;
};

const participantsOnAir = (
	sources: string[],
): DailyStreamingParticipantsConfig => ({
	video: [...new Set(sources.map((key) => key.split(":")[0]))],
	audio: ["*"],
});

/** The rail, top to bottom: the host's mic, then every direction as `[tint, vivid]`. */
export const RAIL_PALETTE: Record<string, [string, string]> = {
	host: [brand[300], brand[500]],
	...Object.fromEntries(
		Object.entries(directionColors).map(([slug, { tint, vivid }]) => [
			slug,
			[tint, vivid],
		]),
	),
};

const RAIL_PALETTE_PARAM = JSON.stringify(RAIL_PALETTE);

/** Everything the composition reads, as Daily's flat string/number params. */
const compositionParams = ({ sources, people, title }: LayoutInput) => ({
	mode: "grid",
	"videoSettings.omitPaused": false,
	"videoSettings.omitAudioOnly": false,
	"videoSettings.preferScreenshare": false,
	"videoSettings.showParticipantLabels": false,
	"videoSettings.margin.left_gu": 0,
	"videoSettings.margin.right_gu": 0,
	"videoSettings.margin.top_gu": 0,
	"videoSettings.margin.bottom_gu": 0,
	"sborka.title": title,
	"sborka.sources": sources.join(","),
	"sborka.people": JSON.stringify(people),
	"sborka.palette": RAIL_PALETTE_PARAM,
	"sborka.frameMin": SBORKA_SPEAKER_FRAME_MIN,
});

/** Our grid replaces the baseline's; the art it draws is served from /public. */
export const sborkaAssets = (origin: string): Record<string, string> => ({
	"components/VideoGrid.js": `${origin}/vcs/sborka/VideoGrid.js`,
	"images/sborka-logo.png": `${origin}/vcs/sborka/sborka-logo.png`,
	"images/sborka-gdhub.png": `${origin}/vcs/sborka/gdhub-logo.png`,
	"images/sborka-grid.png": `${origin}/vcs/sborka/grid.png`,
	...Object.fromEntries(
		Object.keys(RAIL_PALETTE).flatMap((slug) =>
			["on", "off"].map((state) => [
				`images/sborka-${slug}-${state}.png`,
				`${origin}/vcs/sborka/icons/${slug}-${state}.png`,
			]),
		),
	),
});

export const streamStartLayout = (
	input: LayoutInput & { origin: string },
): DailyStartStreamingCustomLayoutConfig => ({
	preset: "custom",
	composition_id: "daily:baseline",
	session_assets: sborkaAssets(input.origin),
	composition_params: compositionParams(input),
	participants: participantsOnAir(input.sources),
});

/** Daily drops the participant filter unless every update repeats it. */
export const streamUpdateLayout = (
	input: LayoutInput,
): DailyUpdateStreamingCustomLayoutConfig => ({
	preset: "custom",
	composition_params: compositionParams(input),
	participants: participantsOnAir(input.sources),
});

/** The broadcast in design pixels (1920×1080); public/vcs/sborka/VideoGrid.js mirrors it. */
export const BROADCAST = {
	header: 84,
	rail: { x: 20, y: 104, w: 60, h: 956 },
	stage: { x: 100, y: 104, w: 1800, h: 956 },
	gap: 20,
	side: 300,
	sideTileMax: 224,
} as const;

export type Frame = { x: number; y: number; w: number; h: number };

/** Where each source sits: one shared screen takes the stage, cameras the side column. */
export const tileFrames = (cameras: number, share: boolean) => {
	const { stage, gap, side, sideTileMax } = BROADCAST;
	if (share) {
		const h = cameras
			? Math.min(sideTileMax, (stage.h - gap * (cameras - 1)) / cameras)
			: 0;
		return {
			share: { x: stage.x, y: stage.y, w: stage.w - side - gap, h: stage.h },
			cameras: Array.from({ length: cameras }, (_, i) => ({
				x: stage.x + stage.w - side,
				y: stage.y + i * (h + gap),
				w: side,
				h,
			})),
		};
	}
	const rows = gridRows(cameras);
	const cols = rows[0] ?? 1;
	const w = (stage.w - gap * (cols - 1)) / cols;
	const h = (stage.h - gap * (rows.length - 1)) / Math.max(1, rows.length);
	return {
		share: null,
		cameras: rows.flatMap((n, r) => {
			const offset = (stage.w - (n * w + gap * (n - 1))) / 2;
			return Array.from({ length: n }, (_, i) => ({
				x: stage.x + offset + i * (w + gap),
				y: stage.y + r * (h + gap),
				w,
				h,
			}));
		}),
	};
};
