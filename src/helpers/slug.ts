import slugify from "voca/slugify";

/** Slugified `value`, or `fallback` when it slugifies to nothing (emoji-only names). */
export const toSlug = (value: string, fallback: string) =>
	slugify(value) || fallback;

/**
 * `base` when nothing uses it yet, otherwise the first free `base-2`, `base-3`, …
 * so a hundred entities sharing a name still each get a readable slug.
 */
export const nextFreeSlug = (base: string, taken: Iterable<string>) => {
	const used = new Set(taken);
	if (!used.has(base)) return base;

	let counter = 2;
	while (used.has(`${base}-${counter}`)) counter++;
	return `${base}-${counter}`;
};
