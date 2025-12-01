// @ts-expect-error - no types
import CheckList from "@editorjs/checklist";
import Delimiter from "@editorjs/delimiter";
import type { ToolConstructable, ToolSettings } from "@editorjs/editorjs";
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
import { Video } from "@hannal/editorjs-video-plugin";
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
	video: {
		class: Video,
		config: {
			// Optional platform configurations
		},
	},
	image: {
		class: CustomImageTool,
		config: {
			field: "file",
			features: {
				caption: "optional",
			},
			uploader: {
				async uploadByFile(file: File) {
					try {
						const data = new FormData();
						data.append("file", file);

						const res = await axios.post("/api/file", data);

						return {
							success: 1,
							file: {
								url: res.data.url,
							},
						};
					} catch (error) {
						const axiosError = error as AxiosError;
						if (axiosError.response?.status === 413) {
							notification.error({
								message: `Your file too large. Maximum file size is ${env(
									"NEXT_PUBLIC_UPLOAD_FILE_FOR_REPORT_MAX_SIZE",
									5,
								)}Mb.`,
							});
						} else {
							notification.error({
								message: "Some problem with uploading. Try insert other image.",
							});
						}

						return {
							success: 0,
						};
					}
				},
				async uploadByUrl(url: string) {
					try {
						let file: File;

						// Handle data URLs (base64 images from clipboard)
						if (url.startsWith("data:")) {
							const response = await fetch(url);
							const blob = await response.blob();
							file = new File([blob], "pasted-image.png", {
								type: blob.type || "image/png",
							});
						} else {
							// Handle regular URLs - download and upload
							const response = await fetch(url);
							const blob = await response.blob();
							file = new File([blob], "image.png", {
								type: blob.type || "image/png",
							});
						}

						// Use the same upload logic as uploadByFile
						const data = new FormData();
						data.append("file", file);

						const res = await axios.post("/api/file", data);

						return {
							success: 1,
							file: {
								url: res.data.url,
							},
						};
					} catch (error) {
						const axiosError = error as AxiosError;
						if (axiosError.response?.status === 413) {
							notification.error({
								message: `Your file too large. Maximum file size is ${env(
									"NEXT_PUBLIC_UPLOAD_FILE_FOR_REPORT_MAX_SIZE",
									5,
								)}Mb.`,
							});
						} else {
							notification.error({
								message: "Some problem with uploading. Try insert other image.",
							});
						}

						return {
							success: 0,
						};
					}
				},
			},
		},
	},
};
