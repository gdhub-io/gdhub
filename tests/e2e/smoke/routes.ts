import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PersonaKey } from "../../personas";

/**
 * Every page of the app and who should get in (GDHUB-130), read from the code so
 * that a new page is covered without a line here: routes from `page.tsx` files,
 * access from the gate in its nearest layout or the page, and the proxy's matcher.
 */

const APP = "src/app";

/** Who stands for each role-gated space: an owner of the fixture `tests/personas.ts` seeds. */
const SPACE_INSIDER: Record<string, PersonaKey> = {
	admin: "superAdmin",
	dev: "superAdmin",
	advisor: "advisor",
	scout: "scout",
	project: "author",
	event: "organiser",
	course: "educator",
};

/** The proxy lets an unfinished onboarding through to these: buying finishes it. */
const OPEN_TO_UNONBOARDED = ["/checkpoint/new", "/registration/onboarding"];

export type Persona = PersonaKey | "anonymous";

export type Route = {
	/** `/user/project/[slug]/team`, as the file system names it. */
	path: string;
	/** Who must get the page; empty means the page itself decides nothing. */
	allowed: Persona[];
	/** Who must be sent away or get a 404. */
	refused: Persona[];
};

const gateOf = (file: string) => {
	let source = "";
	try {
		source = readFileSync(file, "utf8");
	} catch {
		return null;
	}
	const permission = source.match(/createPermissionGate\(\s*"([^"]+)"/)?.[1];
	const space = source.match(/createSpaceGate\(\s*"([^"]+)"/)?.[1];
	return permission || space ? { permission, space } : null;
};

/** The route's gates, nearest first: the page, then each layout on the way up. */
const gatesFor = (segments: string[]) => {
	const gates: NonNullable<ReturnType<typeof gateOf>>[] = [];
	const page = gateOf(join(APP, ...segments, "page.tsx"));
	if (page) gates.push(page);
	for (let depth = segments.length; depth >= 0; depth -= 1) {
		const layout = gateOf(join(APP, ...segments.slice(0, depth), "layout.tsx"));
		if (layout) gates.push(layout);
	}
	return gates;
};

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

const classify = (
	path: string,
	segments: string[],
	matcher: string[],
): Route => {
	const gates = gatesFor(segments);
	const permission = gates.find((gate) => gate.permission);
	if (permission) {
		// The super admin crosses every line, and a plain member holds no gated permission.
		return { path, allowed: ["superAdmin"], refused: ["anonymous", "member"] };
	}
	const space = gates.find((gate) => gate.space)?.space;
	if (space) {
		const insider = SPACE_INSIDER[space];
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
			refused: OPEN_TO_UNONBOARDED.some((root) => isUnder(path, root))
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

const urlOf = (segments: string[]) =>
	`/${segments.filter((segment) => !/^\(.*\)$/.test(segment)).join("/")}`;

export const allRoutes = (): Route[] => {
	const matcher = proxied();
	return pagesIn(APP)
		.map((segments) => classify(urlOf(segments), segments, matcher))
		.sort((a, b) => a.path.localeCompare(b.path));
};
