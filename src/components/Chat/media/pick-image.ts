import type { MatrixClient } from "matrix-js-sdk";
import { type ChatImageRef, exceedsChatImageLimit } from "@/helpers/chat-media";
import { prepareChatImage } from "../ChatComposer/shrink-image";

/** Opens the file picker; resolves with the file, or null when cancelled. */
export function pickImageFile(): Promise<File | null> {
	return new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "image/*";
		input.addEventListener("change", () => resolve(input.files?.[0] ?? null));
		input.addEventListener("cancel", () => resolve(null));
		input.click();
	});
}

export class ImageTooLargeError extends Error {}

/** Shrinks and uploads one image; the composer and Replace image share it. */
export async function uploadChatImage(
	client: MatrixClient,
	file: File,
	options?: {
		abortController?: AbortController;
		onProgress?: (fraction: number) => void;
	},
): Promise<ChatImageRef> {
	const prepared = await prepareChatImage(file);
	options?.abortController?.signal.throwIfAborted();
	if (exceedsChatImageLimit(prepared.blob.size)) throw new ImageTooLargeError();
	const { content_uri } = await client.uploadContent(prepared.blob, {
		name: prepared.name,
		type: prepared.mimetype,
		abortController: options?.abortController,
		progressHandler: options?.onProgress
			? ({ loaded, total }) => options.onProgress?.(total ? loaded / total : 0)
			: undefined,
	});
	return {
		url: content_uri,
		name: prepared.name,
		mimetype: prepared.mimetype,
		size: prepared.blob.size,
		w: prepared.w,
		h: prepared.h,
	};
}
