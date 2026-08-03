/**
 * Design primitives.
 *
 * Nothing here knows about a component or a page — those decisions live in
 * `roles.ts` and `antd.ts`. The values mirror the "DS · 07 Proposal" page of
 * `docs/design/platform-design.pen`; keep the two in sync when either changes.
 */

/** Warm neutral ramp: constant hue (~40°), chroma tapering into the darks. */
export const neutral = {
	0: "#FFFFFF",
	25: "#FAFAF9",
	50: "#F5F4F2",
	100: "#EBEAE8",
	200: "#DCDBD8",
	300: "#C5C4C0",
	400: "#9C9B97",
	500: "#76756F",
	600: "#5A5955",
	700: "#3C3B38",
	800: "#272624",
	900: "#1A1917",
	950: "#0F0F0E",
} as const;

/**
 * Brand ramp. Inside the product this is an orientation colour — active tab,
 * selected row, focus ring, links — and never a button surface; a wall of
 * brand-filled buttons would read as errors. Filled brand belongs to marketing
 * surfaces only.
 */
export const brand = {
	50: "#FEF2F0",
	100: "#FDDDD7",
	200: "#FBBBB0",
	300: "#F79885",
	400: "#F57A67",
	500: "#F15541",
	600: "#DC3E2A",
	700: "#B42E25",
	800: "#8E241D",
	900: "#6E1D17",
} as const;

export type SemanticColor = {
	/** Icons, dots, borders, filled destructive buttons. */
	solid: string;
	/** Tinted background for banners, chips and table rows. */
	tint: string;
	/** Text and icons drawn on `tint`; ≥ 4.5:1 against it. */
	onTint: string;
};

/**
 * Danger sits deliberately deeper and cooler than `brand.500`: at their previous
 * values the two were ~4° apart on the colour wheel and indistinguishable.
 */
export const semantic = {
	success: { solid: "#12854B", tint: "#E8F5EE", onTint: "#0E6B3D" },
	warning: { solid: "#B4690E", tint: "#FDF3E3", onTint: "#8A4F09" },
	danger: { solid: "#B42318", tint: "#FCEBEB", onTint: "#B42318" },
	info: { solid: "#2A5BD7", tint: "#EAF0FD", onTint: "#2A5BD7" },
} as const satisfies Record<string, SemanticColor>;

export type DirectionColor = {
	/** Card hero panels, chips, icon tiles. */
	tint: string;
	/** Label and icon drawn on `tint`. */
	ink: string;
};

/**
 * Work directions are double-encoded — colour *and* icon (icons live in
 * `@/components/DirectionBadge/directions`). Tints are harmonised to a common
 * lightness so the eighteen stop competing, and each carries a paired ink so
 * the colour encodes information rather than decorating a black label.
 */
export const directionColors = {
	development: { tint: "#E7EFFB", ink: "#1F4B8F" },
	"web-development": { tint: "#E1F1F7", ink: "#14566B" },
	"game-design": { tint: "#ECE9FB", ink: "#4B3B9C" },
	"2d-art-animation": { tint: "#FCE9E8", ink: "#98393A" },
	"3d-art-animation": { tint: "#FBEBDD", ink: "#8A4E1B" },
	management: { tint: "#EAEEF4", ink: "#41536B" },
	"game-writer": { tint: "#F6F1D9", ink: "#6B5C17" },
	learning: { tint: "#E0F2EC", ink: "#1C5F51" },
	"technical-art": { tint: "#EBF3DC", ink: "#4C6A22" },
	"music-sound": { tint: "#E2F0FA", ink: "#1A5478" },
	marketing: { tint: "#FBE8E0", ink: "#96452C" },
	vfx: { tint: "#F1E9F9", ink: "#6A3B93" },
	qa: { tint: "#E3F2E7", ink: "#2C6A3E" },
	hr: { tint: "#FAE8F0", ink: "#8D3A61" },
	"video-editing": { tint: "#F6E9F6", ink: "#7A3A72" },
	"backend-development": { tint: "#E8EAF8", ink: "#3A448C" },
	investment: { tint: "#E1F1E6", ink: "#276244" },
	other: { tint: "#EDECEA", ink: "#5A5955" },
} as const satisfies Record<string, DirectionColor>;

export type DirectionSlug = keyof typeof directionColors;

/**
 * Families are bound to CSS variables so the `next/font` loaders in `fonts.ts`
 * stay out of any module that only needs a value.
 */
export const fontFamily = {
	ui: 'var(--gd-font-ui), system-ui, -apple-system, "Segoe UI", sans-serif',
	display:
		"var(--gd-font-display), var(--gd-font-ui), system-ui, -apple-system, sans-serif",
} as const;

export const fontSize = {
	display: 40,
	h1: 32,
	h2: 24,
	h3: 20,
	h4: 16,
	bodyLg: 16,
	body: 14,
	bodySm: 13,
	caption: 12,
	label: 11,
} as const;

export const fontWeight = {
	regular: 400,
	medium: 500,
	semibold: 600,
	/** Display only — never for UI emphasis. */
	bold: 700,
} as const;

export const lineHeight = {
	display: 1.1,
	heading: 1.25,
	ui: 1.4,
	body: 1.5,
	relaxed: 1.6,
} as const;

/** In `em`, applied as `letter-spacing`. */
export const letterSpacing = {
	display: -0.03,
	heading: -0.02,
	normal: 0,
	label: 0.06,
} as const;

export const radius = {
	chip: 6,
	control: 8,
	card: 12,
	panel: 16,
	pill: 9999,
} as const;

export const space = {
	1: 4,
	2: 8,
	3: 12,
	4: 16,
	6: 24,
	8: 32,
	12: 48,
	16: 64,
} as const;

/** `box-shadow` values. `e0` is the default: separation comes from fill, not shadow. */
export const elevation = {
	e0: "none",
	e1: "0 1px 2px rgba(15, 15, 14, 0.06)",
	e2: "0 4px 12px -2px rgba(15, 15, 14, 0.08)",
	e3: "0 16px 40px -8px rgba(15, 15, 14, 0.16)",
} as const;

export const focusRingWidth = 3;
