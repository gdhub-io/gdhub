import { ALLOWED_IMAGE_HOSTS } from "@/helpers/remote-image";

/**
 * Sanity's CDN resizes and re-encodes on the fly, so a picture we uploaded
 * ourselves is requested at the size it is actually painted at instead of at
 * full upload resolution. URLs on any other host are returned untouched —
 * those go through `next/image`.
 */
const SANITY_IMAGE_HOST = "cdn.sanity.io";

/** Sanity re-encodes to WebP/AVIF, so 80 is visually lossless at half the bytes. */
export const DEFAULT_IMAGE_QUALITY = 80;

export type ImageFit = "clip" | "crop" | "fill" | "max" | "min" | "scale";

export interface ImageTransform {
	width?: number;
	height?: number;
	quality?: number;
	fit?: ImageFit;
	/** Device pixel ratio — multiplies width/height on Sanity's side. */
	dpr?: number;
	/** Pins the output format. Without it Sanity negotiates WebP/AVIF per request. */
	format?: "jpg" | "png" | "webp";
}

export function isSanityImage(src?: string | null): src is string {
	if (!src) return false;

	try {
		return new URL(src).hostname === SANITY_IMAGE_HOST;
	} catch {
		return false;
	}
}

export function optimizedImage(src: string, transform?: ImageTransform): string;
export function optimizedImage(
	src: string | null | undefined,
	transform?: ImageTransform,
): string | undefined;
export function optimizedImage(
	src: string | null | undefined,
	transform: ImageTransform = {},
): string | undefined {
	if (!isSanityImage(src)) return src ?? undefined;

	const {
		width,
		height,
		quality = DEFAULT_IMAGE_QUALITY,
		fit = height ? "crop" : "max",
		dpr,
		format,
	} = transform;

	const url = new URL(src);
	if (width) url.searchParams.set("w", String(Math.round(width)));
	if (height) url.searchParams.set("h", String(Math.round(height)));
	url.searchParams.set("q", String(quality));
	url.searchParams.set("fit", fit);
	if (format) {
		url.searchParams.set("fm", format);
	} else {
		// Serves WebP/AVIF to browsers that advertise support, JPEG to the rest.
		url.searchParams.set("auto", "format");
	}
	if (dpr && dpr > 1) url.searchParams.set("dpr", String(Math.min(dpr, 3)));

	return url.toString();
}

/**
 * Source for an antd `<Avatar>` — a plain `<img>` with no srcset, so the
 * retina variant has to be baked into the URL.
 */
export function avatarImage(src: string, size: number): string;
export function avatarImage(
	src: string | null | undefined,
	size: number,
): string | undefined;
export function avatarImage(
	src: string | null | undefined,
	size: number,
): string | undefined {
	return optimizedImage(src, {
		width: size,
		height: size,
		fit: "crop",
		dpr: 2,
		quality: 75,
	});
}

/**
 * Next's optimizer rejects any host missing from `images.remotePatterns` and
 * throws instead of rendering. Content images carry URLs we do not control —
 * a cover pasted into a devlog post, an OAuth avatar from a new provider — so
 * anything off the list has to be rendered as-is rather than optimized.
 */
export function canOptimizeImage(src: string): boolean {
	if (!src.startsWith("http://") && !src.startsWith("https://")) return true;

	try {
		return ALLOWED_IMAGE_HOSTS.has(new URL(src).hostname);
	} catch {
		return false;
	}
}

/** Widths a Sanity-hosted image inside an article column is offered at. */
export const CONTENT_IMAGE_WIDTHS = [480, 640, 828, 1024, 1280, 2048];

/**
 * `srcSet` for a plain `<img>` — content bodies and antd `<Image>` render raw
 * tags, so the browser needs the candidate widths spelled out. Returns
 * `undefined` for hosts that cannot resize.
 */
export function imageSrcSet(
	src: string | null | undefined,
	widths: number[] = CONTENT_IMAGE_WIDTHS,
	transform: Omit<ImageTransform, "width"> = {},
): string | undefined {
	if (!isSanityImage(src)) return undefined;

	return widths
		.map((w) => `${optimizedImage(src, { ...transform, width: w })} ${w}w`)
		.join(", ");
}

/** Widths Next's optimizer accepts — `deviceSizes` plus `imageSizes` from next.config.js. */
const NEXT_IMAGE_WIDTHS = [
	16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048,
	3840,
];

/**
 * Routes a bundled asset through Next's optimizer by hand. CSS backgrounds
 * cannot go through `next/image`, so a `url()` pointing straight at the import
 * ships the raw file — a 1.5 MB landing PNG instead of a 150 kB WebP.
 */
export function staticImageUrl(src: string, width: number): string {
	const w = NEXT_IMAGE_WIDTHS.find((size) => size >= width) ?? 3840;
	return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`;
}
