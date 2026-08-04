import { brand, neutral } from "@/config/design/tokens";

/**
 * Colours for the OG image routes.
 *
 * Satori renders these server-side and does not resolve CSS custom properties,
 * so the share cards cannot read `--gd-*` the way the app does. They import the
 * token values instead — same source of truth, resolved at build time rather
 * than in the browser.
 *
 * The two deep reds are the share-card gradient. They sit below the end of the
 * brand ramp on purpose: the cards need more contrast behind white type than
 * `brand[900]` gives, and they exist nowhere else in the product.
 */
export const ogPalette = {
	/** Warm off-white the cards have always used for type and rules. */
	ink: "#FFFDFC",
	surface: neutral[0],
	backdrop: neutral[950],
	brand: brand[500],
	gradientFrom: "#8C1000",
	gradientTo: "#5F0B00",
	/** Hairlines and dividers drawn over artwork. */
	rule: "#FFFFFF80",
	scrim: "#00000022",
	scrimStrong: "#00000088",
} as const;
