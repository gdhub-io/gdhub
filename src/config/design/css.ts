import { type DesignDensity, type DesignMode, densities, roles } from "./roles";
import {
	amber,
	brand,
	chartSeries,
	directionColors,
	elevation,
	fill,
	fillInverse,
	fontSize,
	lineHeight,
	neutral,
	radius,
	semantic,
	space,
} from "./tokens";

const kebab = (value: string) =>
	value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);

/**
 * The token set as CSS custom properties, so SCSS modules read the same values
 * as the antd theme instead of hard-coding hexes.
 *
 * Mode-dependent roles are emitted under stable names (`--gd-color-surface`),
 * which is what lets an inverse band re-declare them on its own subtree and have
 * every nested component follow.
 */
export function designCssVariables(
	mode: DesignMode = "light",
	density: DesignDensity = "product",
): Record<string, string> {
	const vars: Record<string, string> = {};

	for (const [name, value] of Object.entries(roles[mode])) {
		vars[`--gd-color-${kebab(name)}`] = value;
	}
	for (const [name, value] of Object.entries(densities[density])) {
		vars[`--gd-${kebab(name)}`] = `${value}px`;
	}
	for (const [name, value] of Object.entries(
		mode === "inverse" ? fillInverse : fill,
	)) {
		vars[`--gd-fill-${name}`] = value;
	}
	for (const [step, value] of Object.entries(neutral)) {
		vars[`--gd-neutral-${step}`] = value;
	}
	for (const [step, value] of Object.entries(brand)) {
		vars[`--gd-brand-${step}`] = value;
	}
	for (const [step, value] of Object.entries(amber)) {
		vars[`--gd-amber-${step}`] = value;
	}
	for (const [name, value] of Object.entries(semantic)) {
		vars[`--gd-${name}-solid`] = value.solid;
		vars[`--gd-${name}-tint`] = value.tint;
		vars[`--gd-${name}-on-tint`] = value.onTint;
	}
	for (const [slug, value] of Object.entries(directionColors)) {
		vars[`--gd-direction-${slug}-tint`] = value.tint;
		vars[`--gd-direction-${slug}-ink`] = value.ink;
	}

	// `slot3` → `--gd-chart-series-3`: the key is a valid identifier, the custom
	// property reads as the position it is.
	for (const [slot, value] of Object.entries(chartSeries)) {
		vars[`--gd-chart-series-${slot.replace("slot", "")}`] = value;
	}
	// Shadows were the one scale the theme kept to itself, so a stylesheet that
	// wanted elevation had to hardcode the value — and `var(--gd-shadow-e2)`,
	// which reads like it exists, silently resolved to nothing.
	for (const [name, value] of Object.entries(elevation)) {
		vars[`--gd-shadow-${name}`] = value;
	}
	for (const [name, value] of Object.entries(radius)) {
		vars[`--gd-radius-${name}`] = `${value}px`;
	}
	for (const [step, value] of Object.entries(space)) {
		vars[`--gd-space-${step}`] = `${value}px`;
	}
	for (const [name, value] of Object.entries(fontSize)) {
		vars[`--gd-font-size-${kebab(name)}`] = `${value}px`;
	}
	for (const [name, value] of Object.entries(lineHeight)) {
		vars[`--gd-line-height-${name}`] = String(value);
	}
	for (const [name, value] of Object.entries(elevation)) {
		vars[`--gd-elevation-${name}`] = value;
	}

	return vars;
}

/** The same variables as a declaration block body, for a `<style>` tag. */
export function designCssVariablesText(
	mode: DesignMode = "light",
	density: DesignDensity = "product",
): string {
	return Object.entries(designCssVariables(mode, density))
		.map(([name, value]) => `${name}: ${value};`)
		.join("\n");
}
