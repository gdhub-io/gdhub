// @ts-expect-error - no types
import CheckList from "@editorjs/checklist";
import Delimiter from "@editorjs/delimiter";
import type { ToolConstructable, ToolSettings } from "@editorjs/editorjs";
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
import axios from "axios";

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
				async uploadByFile(file: File) {
					const data = new FormData();
					data.append("file", file);

					const res = await axios.post("/api/file", data);

					return {
						success: 1,
						file: {
							url: res.data.url,
						},
					};
				},
			},
		},
	},
};
