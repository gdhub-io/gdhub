import { Manrope } from "next/font/google";
import { geistFont } from "@/assets/fonts/geist";

/**
 * Font loaders, kept apart from `tokens.ts` so a module that only needs a value
 * does not pull `next/font` into its bundle.
 *
 * Two families with strict jobs: Geist runs every functional surface, Manrope
 * takes page and section titles. `tokens.fontFamily` resolves both through the
 * CSS variables these loaders bind, so `fontClassName` has to be on an ancestor
 * of anything the theme styles.
 */
export const uiFont = geistFont;

export const displayFont = Manrope({
	subsets: ["latin", "cyrillic"],
	weight: ["500", "600", "700"],
	display: "swap",
	variable: "--gd-font-display",
});

export const fontClassName = `${uiFont.variable} ${displayFont.variable}`;
