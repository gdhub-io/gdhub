import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { skipsOnboarding } from "../../../src/components/checkpoints/entry/hrefs";
import type { SpaceType } from "../../../src/config/spaces";
import type { PersonaKey } from "../../personas";

/**
 * Every page of the app and who should get in (GDHUB-130), read from the code so
 * that a new page is covered without a line here: routes from `page.tsx` files,
 * access from the gate in its nearest layout or the page, and the proxy's matcher.
 */

const APP = "src/app";

/** Who stands for each role-gated space: an owner of the fixture `tests/personas.ts` seeds. */
const SPACE_INSIDER: Partial<Record<SpaceType, PersonaKey>> = {
	admin: "superAdmin",
	dev: "superAdmin",
	advisor: "advisor",
	scout: "scout",
	project: "author",
	event: "organiser",
	course: "educator",
};

export type Persona = PersonaKey | "anonymous";

type Route = {
	/** `/user/project/[slug]/team`, as the file system names it. */
	path: string;
	/** Who must get the page. */
	allowed: Persona[];
	/** Who must be sent away or get a 404. */
	refused: Persona[];
};

const sourceOf = (file: string) => {
	try {
		return readFileSync(file, "utf8");
	} catch {
		return "";
	}
};

/** The route's page, then each layout on the way up: the first gate found is the nearest. */
const gateSources = (segments: string[]) =>
	[
		join(APP, ...segments, "page.tsx"),
		...segments
			.map((_, index) => segments.length - index)
			.concat(0)
			.map((depth) => join(APP, ...segments.slice(0, depth), "layout.tsx")),
	]
		.map(sourceOf)
		.join("\n");

/** The prefixes the proxy keeps from a signed-out visitor, read from its matcher. */
const proxied = () => {
	const source = readFileSync("src/proxy.ts", "utf8");
	const matcher = source.slice(source.indexOf("matcher:"));
	return [...matcher.matchAll(/"(\/[^":]*)(?:\/:path\*)?"/g)].map(
		(match) => match[1],
	);
};

const isUnder = (path: string, root: string) =>
	path === root || path.startsWith(`${root}/`);

const urlOf = (segments: string[]) =>
	`/${segments.filter((segment) => !/^\(.*\)$/.test(segment)).join("/")}`;

const classify = (segments: string[], matcher: string[]): Route => {
	const path = urlOf(segments);
	const source = gateSources(segments);
	// The super admin crosses every line, and a plain member holds no gated permission.
	if (/createPermissionGate\(/.test(source)) {
		return { path, allowed: ["superAdmin"], refused: ["anonymous", "member"] };
	}
	const space = source.match(/createSpaceGate\(\s*"([^"]+)"/)?.[1];
	if (space) {
		const insider = SPACE_INSIDER[space as SpaceType];
		if (!insider) {
			throw new Error(
				`${path} is gated by the "${space}" space, which has no persona in SPACE_INSIDER (tests/e2e/smoke/routes.ts)`,
			);
		}
		return { path, allowed: [insider], refused: ["anonymous", "member"] };
	}
	if (matcher.some((root) => isUnder(path, root))) {
		return {
			path,
			allowed: ["member"],
			refused: skipsOnboarding(path)
				? ["anonymous"]
				: ["anonymous", "unonboarded"],
		};
	}
	return { path, allowed: ["anonymous", "member"], refused: [] };
};

const pagesIn = (dir: string, segments: string[] = []): string[][] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		if (entry.isDirectory() && entry.name !== "api") {
			return pagesIn(join(dir, entry.name), [...segments, entry.name]);
		}
		return entry.name === "page.tsx" ? [segments] : [];
	});

export const allRoutes = (): Route[] => {
	const matcher = proxied();
	return pagesIn(APP)
		.map((segments) => classify(segments, matcher))
		.sort((a, b) => a.path.localeCompare(b.path));
};

const MADE_UP = "smoke-missing";

/** Pages that need a query the smoke does not send; they 404 without it, on purpose. */
const NEEDS_QUERY = ["/checkpoint/new/checkout"];

/**
 * The address to open, and whether every parameter in it is real: a page opened
 * with a made-up one may fairly answer 404, and only a crash then counts. `known`
 * is keyed by the route up to and including the parameter.
 */
export const addressOf = (path: string, known: Map<string, string>) => {
	const segments = path.split("/").filter(Boolean);
	const parts = segments.flatMap((segment, index) => {
		if (segment.startsWith("[[...")) return [];
		if (!segment.startsWith("[")) return [segment];
		return known.get(`/${segments.slice(0, index + 1).join("/")}`) ?? MADE_UP;
	});
	return {
		url: `/${parts.join("/")}`,
		real: !parts.includes(MADE_UP) && !NEEDS_QUERY.includes(path),
	};
};
