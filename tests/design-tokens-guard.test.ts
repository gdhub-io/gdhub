import { readFileSync } from "node:fs";
import path from "node:path";
import { glob } from "glob";
import { describe, expect, it } from "vitest";
import { designCssVariables } from "@/config/design/css";

/**
 * The fence.
 *
 * The migration took the tree from 1075 hardcoded colours down to a handful, and
 * without a check the count starts climbing again the first time someone reaches
 * for a hex instead of a token. A colour in a component is a decision the design
 * system already made somewhere else.
 *
 * The allowlist below is not a parking space. Every entry is a case where a role
 * genuinely does not apply — content rather than chrome. Adding to it should feel
 * like an argument you have to win, and the test fails on stale entries so it can
 * only shrink.
 */

const ROOT = path.resolve(__dirname, "..");

/** `#rgb`, `#rrggbb`, `#rrggbbaa` — but not the `#` of a fragment or an id. */
const HEX = /#[0-9a-fA-F]{3,8}\b/g;

/**
 * Files allowed to name colours directly, each for a stated reason. Paths are
 * relative to the repo root.
 */
const ALLOWED: Record<string, string> = {
	// The token definitions themselves — this is where colour is supposed to live.
	"src/config/design/tokens.ts": "the palette",
	"src/config/design/roles.ts": "role values that are not on a ramp",
	"src/config/design/tokens.stories.tsx": "documents a fallback on purpose",
	"src/helpers/og-palette.ts":
		"Satori cannot resolve custom properties; built from the tokens",

	// A gradient stop needs an alpha, and alpha cannot be applied to a `var()`
	// colour reference. The value is declared once at the top of the file.
	"src/components/layouts/SpaceTrail/style.module.scss":
		"the trail separator fades out, so its colour needs an alpha",

	// Content, not chrome. A role would not improve any of these.
	"src/components/GameOnStoreCardList/styles.module.scss":
		"Steam / itch / Google Play / Epic brand colours",
	"src/components/project/cards/ProjectStoreCard.module.scss":
		"Steam / itch / Google Play / Epic brand colours — the dot is the logo",
	"src/components/profile/SkillCapitalIcon.tsx":
		"brand gradient inside an illustration",
	"src/components/GameCard/DefaultCover.tsx": "placeholder cover art gradients",
	"src/components/VerifyCertificate/VerifyResult.tsx": "avatar placeholder fill",
	"src/components/layouts/Header/Header.stories.tsx": "avatar fill in a story",

	// A printed document, rendered outside the browser by DocuSeal: it has its
	// own serif typography and border, and no custom properties to resolve.
};

async function sourceFiles() {
	return glob("src/**/*.{scss,tsx,ts}", {
		cwd: ROOT,
		// Fixtures are sample payloads, not interface.
		ignore: ["**/node_modules/**", "src/mocks/**"],
	});
}

describe("design tokens guard", () => {
	it("keeps hardcoded colours out of components", async () => {
		const files = await sourceFiles();
		const offenders: string[] = [];

		for (const file of files) {
			if (file in ALLOWED) continue;
			const source = readFileSync(path.join(ROOT, file), "utf8");
			const hits = source.match(HEX);
			if (hits?.length) {
				offenders.push(`${file} — ${[...new Set(hits)].join(", ")}`);
			}
		}

		expect(
			offenders,
			[
				"Hardcoded colours found. Use a token:",
				"  SCSS → var(--gd-color-…) / var(--gd-…-tint)",
				"  TSX  → var(--gd-…) inline, or import from @/config/design",
				"If the colour is genuinely content (an illustration, a third-party",
				"brand, a scale the system has no role for), add it to ALLOWED in",
				"tests/design-tokens-guard.test.ts with the reason.",
				"",
				...offenders,
			].join("\n"),
		).toEqual([]);
	});

	/**
	 * A misspelt custom property is silent: the browser drops the declaration and
	 * the element simply renders without it. `--gd-space-5` (the scale has no 5)
	 * cost a card its whole padding while types and tests stayed green — nothing
	 * but a screenshot could catch it. So the names are checked against the ones
	 * the theme actually emits.
	 *
	 * A fallback — `var(--gd-font-mono, monospace)` — is a deliberate opt-out and
	 * passes: it renders correctly whether or not the variable exists.
	 */
	it("only uses design variables the theme emits", async () => {
		// The font families come from `next/font`, which declares them on a wrapper
		// class rather than through the token sheet — read from the source so the
		// two cannot drift.
		const fontVariables = readFileSync(
			path.join(ROOT, "src/config/design/fonts.ts"),
			"utf8",
		).matchAll(/variable:\s*"(--gd-[a-z0-9-]+)"/g);

		const emitted = new Set([
			...Object.keys(designCssVariables("light")),
			...Object.keys(designCssVariables("inverse")),
			...Object.keys(designCssVariables("light", "marketing")),
			...[...fontVariables].map(([, name]) => name),
		]);

		const files = await sourceFiles();
		const offenders: string[] = [];

		for (const file of files) {
			const source = readFileSync(path.join(ROOT, file), "utf8");
			const unknown = new Set<string>();

			for (const [, name, next] of source.matchAll(
				/var\(\s*(--gd-[a-z0-9-]+)\s*(,?)/g,
			)) {
				if (next === ",") continue;
				// `var(--gd-direction-${slug}-tint)` — the name is built at runtime,
				// so the match is a prefix and there is nothing to check.
				if (name.endsWith("-")) continue;
				if (!emitted.has(name)) unknown.add(name);
			}

			if (unknown.size) {
				offenders.push(`${file} — ${[...unknown].join(", ")}`);
			}
		}

		expect(
			offenders,
			[
				"Unknown design variables. The browser drops these declarations",
				"silently, so the styling just goes missing.",
				"Check the name against src/config/design (the spacing scale is",
				"1, 2, 3, 4, 6, 8, 12, 16 — there is no 5), or give it a fallback",
				"if it is deliberately optional.",
				"",
				...offenders,
			].join("\n"),
		).toEqual([]);
	});

	/**
	 * `corner-shape: squircle` is applied to every box in `src/styles/shape.scss`,
	 * which turns a 50% radius into an app icon and a status dot into a square.
	 * A circle or a pill has to say `corner-shape: round` next to its radius —
	 * nothing but a screenshot would catch a missing one.
	 */
	it("keeps circles and pills round under the global squircle", async () => {
		const circular =
			/border-radius:\s*(?:50%|999px|9999px|var\(--gd-radius-pill\))\s*;/;
		const files = (await sourceFiles()).filter(
			(file) => file.endsWith(".scss") && file !== "src/styles/shape.scss",
		);
		const offenders: string[] = [];

		for (const file of files) {
			const lines = readFileSync(path.join(ROOT, file), "utf8").split("\n");
			lines.forEach((line, index) => {
				if (!circular.test(line)) return;
				if (lines[index + 1]?.includes("corner-shape")) return;
				offenders.push(`${file}:${index + 1} — ${line.trim()}`);
			});
		}

		expect(
			offenders,
			[
				"A circular or pill radius with no `corner-shape: round;` under it.",
				"The global squircle in src/styles/shape.scss would square its ends off.",
				"",
				...offenders,
			].join("\n"),
		).toEqual([]);
	});

	it("has no stale allowlist entries", async () => {
		const files = new Set(await sourceFiles());
		const stale: string[] = [];

		for (const file of Object.keys(ALLOWED)) {
			if (!files.has(file)) {
				stale.push(`${file} — no longer exists`);
				continue;
			}
			const source = readFileSync(path.join(ROOT, file), "utf8");
			if (!HEX.test(source)) stale.push(`${file} — no hardcoded colour left`);
			HEX.lastIndex = 0;
		}

		expect(
			stale,
			`Allowlist entries that are no longer needed — remove them:\n${stale.join("\n")}`,
		).toEqual([]);
	});
});
