import { readFileSync } from "node:fs";
import path from "node:path";
import { glob } from "glob";
import { describe, expect, it } from "vitest";

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

	// Content, not chrome. A role would not improve any of these.
	"src/components/GameOnStoreCardList/styles.module.scss":
		"Steam / itch / Google Play / Epic brand colours",
	"src/components/project/cards/ProjectStoreCard.module.scss":
		"Steam / itch / Google Play / Epic brand colours — the dot is the logo",
	"src/components/profile/SkillCapitalIcon.tsx":
		"brand gradient inside an illustration",
	"src/components/GameCard/DefaultCover.tsx": "placeholder cover art gradients",
	"src/components/landing/LandingFeedbackSection/index.tsx":
		"generated avatar skin tone",
	"src/components/Chat/ChatMessages.tsx": "avatar identity fills",
	"src/components/VerifyCertificate/VerifyResult.tsx": "avatar placeholder fill",
	"src/components/event/EventScheduleGantt/index.tsx": "avatar group fill",
	"src/components/layouts/Header/Header.stories.tsx": "avatar fill in a story",

	// A printed document, rendered outside the browser by DocuSeal: it has its
	// own serif typography and border, and no custom properties to resolve.
	"src/services/legal/legal-docuseal.ts": "print certificate template",
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
