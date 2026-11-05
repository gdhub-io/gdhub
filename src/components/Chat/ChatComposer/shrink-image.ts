import { CHAT_IMAGE_MAX_SIDE } from "@/config/chat";
import { fitWithin, needsShrink, renameForType } from "@/helpers/chat-media";

export type PreparedImage = {
	blob: Blob;
	name: string;
	mimetype: string;
	w: number;
	h: number;
};

const QUALITY = 0.85;

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
	return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/**
 * Shrinks a picked image to CHAT_IMAGE_MAX_SIDE as WebP (JPEG where the browser
 * cannot encode WebP). The size limit is the caller's call: this only shrinks.
 */
export async function prepareChatImage(file: File): Promise<PreparedImage> {
	const bitmap = await createImageBitmap(file);
	try {
		const { width, height } = bitmap;
		if (!needsShrink(width, height, file.size, CHAT_IMAGE_MAX_SIDE)) {
			return {
				blob: file,
				name: file.name,
				mimetype: file.type,
				w: width,
				h: height,
			};
		}
		const box = fitWithin(width, height, CHAT_IMAGE_MAX_SIDE);
		const canvas = document.createElement("canvas");
		canvas.width = box.width;
		canvas.height = box.height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Canvas 2D is unavailable");
		context.drawImage(bitmap, 0, 0, box.width, box.height);

		// Safari without WebP encoding hands back a PNG instead of failing.
		let blob = await encode(canvas, "image/webp");
		if (blob?.type !== "image/webp") blob = await encode(canvas, "image/jpeg");
		if (!blob) throw new Error("Could not encode the image");
		return {
			blob,
			name: renameForType(file.name, blob.type),
			mimetype: blob.type,
			w: box.width,
			h: box.height,
		};
	} finally {
		bitmap.close();
	}
}
