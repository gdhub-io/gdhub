"use client";

import NextImage, { type ImageProps } from "next/image";
import { canOptimizeImage } from "@/helpers/image";
import { contentImageLoader } from "@/lib/image-loader";

export type AppImageProps = ImageProps;

/**
 * `next/image` for pictures that come from users or the CMS. Same API — it
 * swaps in the loader that routes Sanity uploads to Sanity's own CDN, and
 * falls back to an unoptimized `<img>` for hosts Next is not configured for
 * (which it would otherwise refuse to render at all).
 *
 * Keep plain `next/image` for bundled design assets.
 */
export function AppImage({ src, unoptimized, ...rest }: AppImageProps) {
	const skipOptimization =
		unoptimized ?? (typeof src === "string" && !canOptimizeImage(src));

	return (
		<NextImage
			src={src}
			loader={contentImageLoader}
			unoptimized={skipOptimization}
			{...rest}
		/>
	);
}
