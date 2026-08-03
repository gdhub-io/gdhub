import { describe, expect, it } from "vitest";
import { WORK_DIRECTIONS } from "@/components/DirectionBadge/directions";
import { buildAntdTheme } from "@/config/design/antd";
import { designCssVariables } from "@/config/design/css";
import { type DesignMode, roles } from "@/config/design/roles";
import { directionColors, semantic } from "@/config/design/tokens";

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

	it("keeps every ink readable on its own tint", () => {
		for (const [slug, { tint, ink }] of Object.entries(directionColors)) {
			expect(contrast(ink, tint), slug).toBeGreaterThanOrEqual(4.5);
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
		expect(theme.components?.Tabs?.inkBarColor).toBe(roles.light.accent);
		expect(theme.components?.Table?.rowSelectedBg).toBe(
			roles.light.accentSubtle,
		);
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
