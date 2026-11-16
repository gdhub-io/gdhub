/**
 * Renders the Sborka broadcast art the VCS composition cannot draw itself:
 * one PNG per work direction in both rail states, and the editor grid.
 * Daily fetches them from /public when a broadcast starts (GDHUB-207).
 *
 *   bun scripts/live-sborka-assets.ts
 */
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { WORK_DIRECTIONS } from "@/components/DirectionBadge/directions";
import { directionColors } from "@/config/design/tokens";
import { SBORKA_STREAM } from "@/config/live";

const OUT = path.resolve("public/vcs/sborka");
const TABLER = path.resolve("node_modules/@tabler/icons/icons/outline");

/** Tabler's component name → its SVG file: `DeviceGamepad2` → `device-gamepad-2`. */
const svgName = (displayName = "") =>
	displayName
		.replace(/([a-z])([A-Z0-9])/g, "$1-$2")
		.replace(/([0-9])([A-Z])/g, "$1-$2")
		.toLowerCase();

const ICONS: Record<string, string> = {
	host: "microphone",
	...Object.fromEntries(
		WORK_DIRECTIONS.map(({ slug, icon }) => [slug, svgName(icon.displayName)]),
	),
};

const STATES = { on: "#FFFFFF", off: "rgba(161,161,170,0.7)" };
const ICON_PX = 56;

const icon = (name: string, colour: string) =>
	readFileSync(path.join(TABLER, `${name}.svg`), "utf8").replace(
		/currentColor/g,
		colour,
	);

const grid = () => {
	const { width } = SBORKA_STREAM;
	const height = 996;
	const lines = (step: number, colour: string, stroke: number) => {
		const out: string[] = [];
		for (let x = 0; x <= width; x += step)
			out.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}"/>`);
		for (let y = 0; y <= height; y += step)
			out.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}"/>`);
		return `<g stroke="${colour}" stroke-width="${stroke}">${out.join("")}</g>`;
	};
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#131314"/>${lines(20, "#1F2021", 1)}${lines(100, "#292A2C", 1.5)}</svg>`;
};

const missing = Object.keys(directionColors).filter((slug) => !ICONS[slug]);
if (missing.length) throw new Error(`No icon for ${missing.join(", ")}`);

mkdirSync(path.join(OUT, "icons"), { recursive: true });
await Promise.all(
	Object.entries(ICONS).flatMap(([slug, name]) =>
		Object.entries(STATES).map(([state, colour]) =>
			sharp(Buffer.from(icon(name, colour)))
				.resize(ICON_PX, ICON_PX)
				.png()
				.toFile(path.join(OUT, "icons", `${slug}-${state}.png`)),
		),
	),
);
await sharp(Buffer.from(grid())).png().toFile(path.join(OUT, "grid.png"));
console.log(`Wrote ${Object.keys(ICONS).length * 2} icons and the grid to ${OUT}`);
