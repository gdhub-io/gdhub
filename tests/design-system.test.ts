import { describe, expect, it } from "vitest";
import { WORK_DIRECTIONS } from "@/components/DirectionBadge/directions";
import { buildAntdTheme } from "@/config/design/antd";
import { designCssVariables } from "@/config/design/css";
import { type DesignMode, roles } from "@/config/design/roles";
import { brand, directionColors, semantic } from "@/config/design/tokens";

const channel = (value: number) => {
	const c = value / 255;
	return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) => {
	const value = hex.replace("#", "");
	const r = Number.parseInt(value.slice(0, 2), 16);
	const g = Number.parseInt(value.slice(2, 4), 16);
	const b = Number.parseInt(value.slice(4, 6), 16);
	return (
		0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
	);
};

const contrast = (a: string, b: string) => {
	const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (light + 0.05) / (dark + 0.05);
};

const MODES: DesignMode[] = ["light", "inverse"];

describe("direction palette", () => {
	it("covers exactly the slugs the badge component ships", () => {
		expect(Object.keys(directionColors).sort()).toEqual(
			WORK_DIRECTIONS.map((d) => d.slug).sort(),
		);
	});

	it("is the only owner of the colours the badge renders", () => {
		for (const d of WORK_DIRECTIONS) {
			expect(d.color, d.slug).toBe(directionColors[d.slug].tint);
			expect(d.ink, d.slug).toBe(directionColors[d.slug].ink);
		}
	});

	// 7:1, not the 4.5:1 minimum: these pairs carry a 16px icon at 2px stroke,
	// and a merely "readable" ink renders it washed out at that size.
	it("keeps every ink crisp on its own tint", () => {
		for (const [slug, { tint, ink }] of Object.entries(directionColors)) {
			expect(contrast(ink, tint), slug).toBeGreaterThanOrEqual(7);
		}
	});

	it("keeps every tint visibly coloured rather than grey", () => {
		for (const [slug, { tint }] of Object.entries(directionColors)) {
			if (slug === "other") continue;
			const value = tint.replace("#", "");
			const channels = [0, 2, 4].map((i) =>
				Number.parseInt(value.slice(i, i + 2), 16),
			);
			const spread = Math.max(...channels) - Math.min(...channels);
			expect(spread, slug).toBeGreaterThanOrEqual(20);
		}
	});
});

describe("semantic colours", () => {
	it("keeps onTint readable on tint", () => {
		for (const [name, color] of Object.entries(semantic)) {
			expect(contrast(color.onTint, color.tint), name).toBeGreaterThanOrEqual(
				4.5,
			);
		}
	});

	it("keeps solid readable on a light surface", () => {
		for (const [name, color] of Object.entries(semantic)) {
			expect(contrast(color.solid, roles.light.surface), name).toBeGreaterThan(
				3,
			);
		}
	});
});

describe("role contrast", () => {
	it.each(MODES)("%s mode meets the text minimums", (mode) => {
		const r = roles[mode];
		expect(contrast(r.text, r.surface)).toBeGreaterThanOrEqual(7);
		expect(contrast(r.textSecondary, r.surface)).toBeGreaterThanOrEqual(4.5);
		expect(contrast(r.link, r.surface)).toBeGreaterThanOrEqual(4.5);
		expect(contrast(r.onAction, r.action)).toBeGreaterThanOrEqual(4.5);
	});

	it.each(MODES)("%s mode defines every role", (mode) => {
		for (const [name, value] of Object.entries(roles[mode])) {
			expect(value, name).toMatch(/^#[0-9A-Fa-f]{6,8}$/);
		}
	});
});

describe("antd theme", () => {
	it("keeps the action colour as primary, not the brand", () => {
		expect(buildAntdTheme().token?.colorPrimary).toBe(roles.light.action);
	});

	it("drops the near-black default border", () => {
		expect(buildAntdTheme().token?.colorBorder).toBe(roles.light.border);
	});

	it("orients with the brand instead of filling with it", () => {
		const theme = buildAntdTheme();
		expect(theme.components?.Table?.rowSelectedBg).toBe(
			roles.light.accentSubtle,
		);
	});

	/**
	 * Navigation is the one place the brand is barred from: a coloured tab on a
	 * bar the user reads all day stops meaning "you are here" and starts meaning
	 * "something is wrong". Both the shell nav and in-page tabs are neutral.
	 */
	it("keeps navigation neutral", () => {
		const theme = buildAntdTheme();
		expect(theme.components?.Tabs?.inkBarColor).toBe(roles.light.text);
		expect(theme.components?.Menu?.horizontalItemSelectedColor).toBe(
			roles.light.text,
		);
		// Neutral, and visible: this used to assert the fill equalled
		// `surfaceSunken`, which is the page background — locking in a current
		// item nobody could see.
		const selected = String(theme.components?.Menu?.itemSelectedBg);
		expect(selected).not.toBe(roles.light.bg);
		expect(selected.toLowerCase()).not.toContain(brand[500].toLowerCase());
	});

	it("orders the control ladder correctly", () => {
		const token = buildAntdTheme().token;
		expect(token?.controlHeightSM).toBeLessThan(Number(token?.controlHeight));
		expect(token?.controlHeight).toBeLessThan(Number(token?.controlHeightLG));
	});
});

describe("css variables", () => {
	it("emits a variable for every direction", () => {
		const vars = designCssVariables();
		for (const slug of Object.keys(directionColors)) {
			expect(vars[`--gd-direction-${slug}-tint`]).toBeDefined();
			expect(vars[`--gd-direction-${slug}-ink`]).toBeDefined();
		}
	});

	it("re-declares the mode-dependent roles under stable names", () => {
		const light = designCssVariables("light");
		const inverse = designCssVariables("inverse");
		expect(Object.keys(light)).toEqual(Object.keys(inverse));
		expect(light["--gd-color-surface"]).not.toBe(
			inverse["--gd-color-surface"],
		);
	});
});
