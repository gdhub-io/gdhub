import type { ImageLoaderProps } from "next/image";
import {
	DEFAULT_IMAGE_QUALITY,
	isSanityImage,
	optimizedImage,
} from "@/helpers/image";

/**
 * Next's built-in optimizer only accepts qualities listed in
 * `images.qualities` (default: 75) — anything else is rejected with a 400.
 */
const NEXT_IMAGE_QUALITY = 75;

/**
 * Per-image loader for user- and CMS-supplied pictures. Sanity-hosted uploads
 * are resized by Sanity's CDN (free, cached at the edge, no server CPU);
 * everything else keeps going through `/_next/image`, exactly as the default
 * loader would build it.
 *
 * Passed via the `loader` prop rather than `images.loaderFile`: a global custom
 * loader makes Next 404 the `/_next/image` endpoint, which would leave the
 * non-Sanity hosts (Google/GitHub avatars, YouTube thumbnails) unoptimized.
 */
export function contentImageLoader({
	src,
	width,
	quality,
}: ImageLoaderProps): string {
	if (isSanityImage(src)) {
		return optimizedImage(src, {
			width,
			quality: quality ?? DEFAULT_IMAGE_QUALITY,
		});
	}

	const q = quality ?? NEXT_IMAGE_QUALITY;
	return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${q}`;
}
