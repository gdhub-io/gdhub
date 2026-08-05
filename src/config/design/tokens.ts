/**
 * Design primitives.
 *
 * Nothing here knows about a component or a page — those decisions live in
 * `roles.ts` and `antd.ts`. The values mirror the "DS · Tokens — as shipped"
 * page of `docs/design/platform-design.pen`; keep the two in sync when either
 * changes.
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

/**
 * The marketing second accent. The landing splits its audiences by colour —
 * authors get the brand, specialists get this amber — and the two sit far enough
 * apart in hue to read as different invitations rather than two shades of one.
 *
 * It stays out of the product: inside the app a single accent is what keeps the
 * brand meaningful.
 */
export const amber = {
	100: "#FFF0D6",
	200: "#FFE0AE",
	400: "#FFBB55",
	600: "#C66C19",
	800: "#811812",
	900: "#33170D",
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
 * `@/components/DirectionBadge/directions`). Tints share a lightness (L≈93) so
 * the eighteen stop competing, but keep real chroma: a chip has to read as
 * coloured, not as grey.
 *
 * Ink sits near L≈25. It is the tint's own hue pulled dark, which ties the icon
 * to its chip while keeping it crisp — a mid-dark ink measured only ~6:1 against
 * its tint and washed out at 16px.
 */
export const directionColors = {
	development: { tint: "#DCE9FB", ink: "#163A6E" },
	"web-development": { tint: "#D6EEF6", ink: "#0E4354" },
	"game-design": { tint: "#E5DFFA", ink: "#382A7A" },
	"2d-art-animation": { tint: "#FBDEDC", ink: "#7A2A28" },
	"3d-art-animation": { tint: "#FBE3D0", ink: "#6E3C12" },
	management: { tint: "#DDE6F3", ink: "#2F3F55" },
	"game-writer": { tint: "#F5EEC6", ink: "#55480F" },
	learning: { tint: "#D5EEE6", ink: "#10493E" },
	"technical-art": { tint: "#E4F0CE", ink: "#3A5418" },
	"music-sound": { tint: "#D7EAF8", ink: "#114059" },
	marketing: { tint: "#FBDFD2", ink: "#78341F" },
	vfx: { tint: "#EDE0F7", ink: "#532C74" },
	qa: { tint: "#D9EDDF", ink: "#1F5330" },
	hr: { tint: "#F9DEEB", ink: "#6E2B4B" },
	"video-editing": { tint: "#F4DEF2", ink: "#5E2B57" },
	"backend-development": { tint: "#DFE3F5", ink: "#2A3370" },
	investment: { tint: "#D8ECDF", ink: "#1B4C33" },
	other: { tint: "#E9E7E4", ink: "#44433F" },
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
	// 10 rather than 8: the product is full of rounded squares — icon tiles,
	// covers, avatars — and a tighter control radius read as a different family.
	control: 10,
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
