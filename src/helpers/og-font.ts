/**
 * Load a font for OG image generation from the `/public/fonts` directory over
 * HTTP (relative to the incoming request origin).
 *
 * We serve the font from `/public` instead of `fetch(new URL(file, import.meta.url))`
 * because under Next 16 / Turbopack the latter tries to resolve the `.ttf` as a
 * module (dev) or fails to fetch a file URL in the edge sandbox. An HTTP fetch to
 * the app's own origin works uniformly in dev, production and edge/node runtimes.
 */
export async function loadOgFont(
	request: Request,
	file: string,
): Promise<ArrayBuffer> {
	const res = await fetch(new URL(`/fonts/${file}`, request.url));
	if (!res.ok) {
		throw new Error(`Failed to load OG font ${file}: ${res.status}`);
	}
	return res.arrayBuffer();
}

/**
 * Decode a URL-encoded OG param without throwing. `searchParams.get` already
 * decodes once, so a value that legitimately contains a literal "%" (e.g. a
 * title like "50% off") would make a second `decodeURIComponent` throw
 * "URI malformed". This falls back to the raw value in that case.
 */
export function safeDecodeURIComponent(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}
