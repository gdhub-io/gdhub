import { type ImageTransform, optimizedImage } from "@/helpers/image";
import { allowedImage } from "@/helpers/remote-image";

/**
 * Satori fetches the cover itself and cannot negotiate a modern format, so the
 * upload is asked for pre-cropped to the card frame as JPEG rather than at
 * whatever resolution it was uploaded at.
 */
export const OG_COVER: ImageTransform = {
	width: 1200,
	height: 630,
	fit: "crop",
	quality: 70,
	format: "jpg",
};

/** A cover for an OG image, or null; Satori fetches it server-side, so only our own image hosts are let through. */
export const ogCover = (
	url: string | null | undefined,
	transform: ImageTransform = OG_COVER,
): string | null => {
	const allowed = allowedImage(url);
	return allowed ? optimizedImage(allowed, transform) : null;
};
