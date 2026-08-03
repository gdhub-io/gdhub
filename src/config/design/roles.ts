import { brand, neutral } from "./tokens";

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
	link: string;
};

export const roles: Record<DesignMode, DesignRoles> = {
	light: {
		bg: neutral[25],
		surface: neutral[0],
		surfaceSunken: neutral[50],
		surfaceInverse: neutral[900],
		border: neutral[100],
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
		link: brand[700],
	},
	inverse: {
		bg: neutral[950],
		surface: neutral[900],
		surfaceSunken: neutral[800],
		surfaceInverse: neutral[0],
		border: "#FFFFFF14",
		borderStrong: "#FFFFFF29",
		borderFocus: brand[500],
		text: neutral[50],
		textSecondary: neutral[400],
		textTertiary: neutral[500],
		textInverse: neutral[900],
		// The one context where the brand fills a button: on a dark band there is
		// no error state to confuse it with, and the CTA has to carry the page.
		// Its label is ink rather than white — white on brand-500 is 3.4:1, which
		// fails at label sizes, while the dark ink reads at 5.5:1.
		action: brand[500],
		actionHover: brand[400],
		onAction: neutral[950],
		accent: brand[500],
		accentHover: brand[400],
		accentSubtle: "#F1554124",
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
