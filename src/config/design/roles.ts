import { amber, brand, neutral } from "./tokens";

/**
 * Surface mode. The three historical themes (landing / public / app) differ in
 * exactly these role values — not in fonts, radii or control sizes — so a dark
 * header band is a mode applied to a subtree, not a theme of its own.
 */
export type DesignMode = "light" | "inverse";

/** How roomy a context is. Marketing breathes, the product packs. */
export type DesignDensity = "product" | "marketing";

export type DesignRoles = {
	/** Page background. Cards separate from it by fill, not by a border. */
	bg: string;
	surface: string;
	surfaceSunken: string;
	/** Opposite-mode surface: tooltips, inverse bands, dark chips. */
	surfaceInverse: string;
	border: string;
	/**
	 * The lightest hairline in the system: row separators inside a table, where
	 * `border` repeats often enough to read as a grid.
	 */
	borderSubtle: string;
	borderStrong: string;
	borderFocus: string;
	text: string;
	textSecondary: string;
	/** Placeholders and disabled text only — below 4.5:1 on `surface`. */
	textTertiary: string;
	textInverse: string;
	/** Fill of the button that commits. Carries emphasis, not meaning. */
	action: string;
	actionHover: string;
	onAction: string;
	/** Orientation colour: active tab, selected row, focus ring, progress. */
	accent: string;
	accentHover: string;
	accentSubtle: string;
	/**
	 * The marketing second voice. The landing addresses two audiences and tells
	 * them apart by colour — authors get the brand, specialists get this. It has
	 * no job inside the product, where a single accent is the whole point.
	 */
	accentAlt: string;
	accentAltHover: string;
	/** Label drawn on `accentAlt`; the amber is too light to carry white. */
	onAccentAlt: string;
	link: string;
};

export const roles: Record<DesignMode, DesignRoles> = {
	light: {
		// neutral-50 rather than 25: white cards need a floor to sit on, and the
		// ramp's warmth only starts reading a step below near-white.
		bg: neutral[50],
		surface: neutral[0],
		surfaceSunken: neutral[50],
		surfaceInverse: neutral[900],
		border: neutral[100],
		borderSubtle: neutral[50],
		borderStrong: neutral[200],
		borderFocus: neutral[900],
		text: neutral[900],
		textSecondary: neutral[500],
		textTertiary: neutral[400],
		textInverse: neutral[0],
		action: neutral[900],
		actionHover: neutral[800],
		onAction: neutral[0],
		accent: brand[500],
		accentHover: brand[600],
		accentSubtle: brand[50],
		accentAlt: amber[400],
		accentAltHover: amber[600],
		onAccentAlt: neutral[950],
		link: brand[700],
	},
	inverse: {
		bg: neutral[950],
		surface: neutral[900],
		surfaceSunken: neutral[800],
		surfaceInverse: neutral[0],
		border: "#FFFFFF14",
		borderSubtle: "#FFFFFF0A",
		borderStrong: "#FFFFFF29",
		borderFocus: brand[500],
		// Pure white, not neutral-50: on a dark band the off-white reads as a
		// slightly dirty grey at display sizes rather than as restraint.
		text: neutral[0],
		textSecondary: neutral[400],
		textTertiary: neutral[500],
		textInverse: neutral[900],
		// The one context where the brand fills a button: on a dark band there is
		// no error state to confuse it with, and the CTA has to carry the page.
		// Deep enough that a white label clears the 4.5:1 minimum: brand-500 gave
		// 3.4:1 and brand-600 only 4.4:1, both of which the contrast test rejects
		// at button-label sizes. brand-700 reaches 6.2:1.
		// The landings' louder CTA is not a role: `[data-gd-landing]` in globals.scss.
		action: brand[700],
		actionHover: brand[600],
		onAction: neutral[0],
		accent: brand[500],
		accentHover: brand[400],
		accentSubtle: "#F1554124",
		accentAlt: amber[400],
		accentAltHover: amber[600],
		onAccentAlt: neutral[950],
		link: brand[400],
	},
};

export type DensityScale = {
	controlHeightSm: number;
	controlHeight: number;
	controlHeightLg: number;
	fontSize: number;
	cellPaddingBlock: number;
	cellPaddingInline: number;
	cardPadding: number;
	sectionGap: number;
	pageGutter: number;
};

export const densities: Record<DesignDensity, DensityScale> = {
	product: {
		controlHeightSm: 32,
		controlHeight: 40,
		controlHeightLg: 48,
		fontSize: 14,
		cellPaddingBlock: 12,
		cellPaddingInline: 16,
		cardPadding: 20,
		sectionGap: 24,
		pageGutter: 24,
	},
	marketing: {
		controlHeightSm: 40,
		controlHeight: 48,
		controlHeightLg: 56,
		fontSize: 16,
		cellPaddingBlock: 16,
		cellPaddingInline: 20,
		cardPadding: 24,
		sectionGap: 40,
		pageGutter: 64,
	},
};
