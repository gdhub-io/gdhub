import { Plus_Jakarta_Sans } from "next/font/google";

/**
 * Font loaders, kept apart from `tokens.ts` so a module that only needs a value
 * does not pull `next/font` into its bundle.
 *
 * One family carries both roles. Plus Jakarta Sans is neutral enough to run a
 * dense list row and has enough character at 32px to head a page, so the split
 * between UI and display is a matter of weight and tracking rather than a second
 * typeface — one family means one set of metrics and nothing to keep in tune.
 *
 * Two loaders because `next/font` binds a single CSS variable per call; the
 * options match, so both resolve to the same files and the browser fetches them
 * once. `tokens.fontFamily` reads these variables, which is why `fontClassName`
 * has to sit on an ancestor of anything the theme styles.
 */
export const uiFont = Plus_Jakarta_Sans({
	subsets: ["latin"],
	display: "swap",
	variable: "--gd-font-ui",
});

export const displayFont = Plus_Jakarta_Sans({
	subsets: ["latin"],
	display: "swap",
	variable: "--gd-font-display",
});

export const fontClassName = `${uiFont.variable} ${displayFont.variable}`;
