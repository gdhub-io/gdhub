import { readFileSync } from "node:fs";
import path from "node:path";
import { glob } from "glob";
import { describe, expect, it } from "vitest";
import { SPACE_TYPES, spaceList } from "@/config/spaces";
import { permissionsOf } from "@/config/spaces/define-space";

/**
 * docs/spaces.md is what people read to learn what the platform is made of and
 * what to test. It is written by hand, so this keeps it from drifting: every
 * space, feature and space page in the code must be on it, and its list of
 * permissions nobody checks must match the code — in both directions, so the
 * list can only shrink.
 */

const ROOT = path.resolve(__dirname, "..");
const DOC = readFileSync(path.join(ROOT, "docs/spaces.md"), "utf8");
const SPACES_DIR = "src/app/(app)/(spaces)";

const section = (heading: string): string => {
	const start = DOC.indexOf(`\n## ${heading}\n`);
	if (start === -1) return "";
	const end = DOC.indexOf("\n## ", start + 1);
	return DOC.slice(start, end === -1 ? undefined : end);
};

/** `(app)/(spaces)/user/project/[slug]/settings/[[...item]]/page.tsx` → `/user/project/[slug]/settings/*`. */
const routeOf = (pageFile: string): string =>
	`/${path.dirname(path.relative(SPACES_DIR, pageFile))}`
		.replace(/\/\[\[?\.\.\.[^\]]+\]\]?/g, "/*")
		.replace(/\/\.$/, "");

describe("docs/spaces.md", () => {
	it.each(SPACE_TYPES)("has a section for the %s space", (type) => {
		expect(section(type)).not.toBe("");
	});

	it.each(spaceList().map((space) => [space.type, space] as const))(
		"names every feature of the %s space in its section",
		(type, space) => {
			const text = section(type);
			const missing = Object.keys(space.features).filter(
				(feature) =>
					!text.includes(`\`${feature}\``) && !text.includes(`${type}.${feature}.`),
			);
			expect(missing).toEqual([]);
		},
	);

	it("lists every page under (spaces)", async () => {
		const pages = await glob(`${SPACES_DIR}/**/page.tsx`, { cwd: ROOT });
		const missing = pages
			.map(routeOf)
			.filter((route) => !DOC.includes(`\`${route}\``))
			.sort();
		expect(missing).toEqual([]);
	});

	it("lists exactly the permissions no code checks", async () => {
		const files = await glob("src/**/*.{ts,tsx}", {
			cwd: ROOT,
			ignore: ["src/config/spaces/**"],
		});
		const source = files
			.map((file) => readFileSync(path.join(ROOT, file), "utf8"))
			.join("\n");

		const unchecked = spaceList()
			.flatMap(permissionsOf)
			.filter((permission) => !source.includes(`"${permission}"`))
			.sort();

		const listed = [
			...section("Declared, not yet checked anywhere").matchAll(
				/`([a-z_]+\.[a-z_]+\.[a-z]+)`/g,
			),
		]
			.map((match) => match[1])
			.sort();

		expect(listed).toEqual(unchecked);
	});
});
