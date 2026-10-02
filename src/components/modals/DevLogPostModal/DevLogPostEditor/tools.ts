// @ts-expect-error - no types
import CheckList from "@editorjs/checklist";
import Delimiter from "@editorjs/delimiter";
import type { ToolConstructable, ToolSettings } from "@editorjs/editorjs";
// @ts-expect-error - dist/index.d.ts exists but package.json `exports` lacks a "types" entry
import Embed from "@editorjs/embed";
import Header from "@editorjs/header";
import Image from "@editorjs/image";
// @ts-expect-error - no types
import LinkTool from "@editorjs/link";
import List from "@editorjs/list";
// @ts-expect-error - no types
import Marker from "@editorjs/marker";
import Paragraph from "@editorjs/paragraph";
import Quote from "@editorjs/quote";
import Table from "@editorjs/table";
import { notification } from "antd";
import axios, { type AxiosError } from "axios";
import { env } from "@/helpers/env";

class CustomImageTool extends Image {
	async removed() {
		const url = (this as any).data.file.url;

		try {
			await axios.delete("/api/file", {
				params: { fileUrl: url },
			});
		} catch (error) {
			console.warn("Failed to delete image file:", error);
		}
	}
}

function uploadFailed() {
	notification.error({
		message: "Some problem with uploading. Try insert other image.",
	});

	return { success: 0 as const };
}

/** Stores a picture and answers in the shape the image tool expects. */
export async function uploadImage(file: File) {
	try {
		const data = new FormData();
		data.append("file", file);

		const res = await axios.post("/api/file", data);

		return { success: 1 as const, file: { url: res.data.url as string } };
	} catch (error) {
		if ((error as AxiosError).response?.status !== 413) return uploadFailed();

		notification.error({
			message: `Your file too large. Maximum file size is ${env(
				"NEXT_PUBLIC_UPLOAD_FILE_FOR_REPORT_MAX_SIZE",
				5,
			)}Mb.`,
		});

		return { success: 0 as const };
	}
}

export const tools: {
	[toolName: string]: ToolConstructable | ToolSettings;
} = {
	header: {
		class: Header as unknown as ToolConstructable,
		inlineToolbar: ["link"],
	},
	list: {
		class: List as unknown as ToolConstructable,
		inlineToolbar: true,
	},
	paragraph: {
		class: Paragraph as unknown as ToolConstructable,
		inlineToolbar: true,
	},
	linkTool: {
		class: LinkTool,
		inlineToolbar: true,
		config: {
			endpoint: `/api/internal/link-parse`, // Your backend endpoint for url data fetching,
		},
	},
	quote: {
		class: Quote,
		inlineToolbar: true,
	},
	marker: {
		class: Marker,
		inlineToolbar: true,
	},
	checklist: {
		class: CheckList,
		inlineToolbar: true,
	},
	delimiter: {
		class: Delimiter,
		inlineToolbar: true,
	},
	table: {
		class: Table as unknown as ToolConstructable,
		inlineToolbar: true,
	},
	embed: {
		class: Embed as unknown as ToolConstructable,
		inlineToolbar: true,
	},
	image: {
		class: CustomImageTool,
		config: {
			field: "file",
			features: {
				caption: "optional",
			},
			uploader: {
				uploadByFile: uploadImage,
				async uploadByUrl(url: string) {
					// Covers both a pasted link and a base64 image from the clipboard.
					const blob = await fetch(url)
						.then((response) => response.blob())
						.catch(() => null);
					if (!blob) return uploadFailed();

					return uploadImage(
						new File([blob], "image.png", { type: blob.type || "image/png" }),
					);
				},
			},
		},
	},
};
