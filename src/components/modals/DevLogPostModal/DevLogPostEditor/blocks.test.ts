import type EditorJS from "@editorjs/editorjs";
import { describe, expect, it, vi } from "vitest";
import { embedDataFromUrl, insertBlock } from "./blocks";

describe("embedDataFromUrl", () => {
	it("resolves a YouTube link to its embed address", () => {
		const data = embedDataFromUrl(
			"https://www.youtube.com/watch?v=dQw4w9WgXcQ",
		);

		expect(data?.service).toBe("youtube");
		expect(data?.source).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
		expect(data?.embed).toContain("youtube.com/embed/dQw4w9WgXcQ");
	});

	it("refuses a link no service recognises", () => {
		expect(embedDataFromUrl("https://example.com/clip.mp4")).toBeNull();
		expect(embedDataFromUrl("")).toBeNull();
	});

	it("refuses a video link buried in other text", () => {
		expect(
			embedDataFromUrl("watch https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
		).toBeNull();
	});
});

describe("insertBlock", () => {
	const editorWith = (emptiness: boolean[]) => {
		const insert = vi.fn();
		const setToBlock = vi.fn();
		const editor = {
			caret: { setToBlock },
			blocks: {
				insert,
				getBlocksCount: () => emptiness.length,
				getBlockByIndex: (index: number) =>
					index in emptiness ? { isEmpty: emptiness[index] } : undefined,
			},
		} as unknown as EditorJS;

		return { editor, insert, setToBlock };
	};

	it("replaces the empty block the caret is in", () => {
		const { editor, insert, setToBlock } = editorWith([false, true, false]);

		insertBlock(editor, 1, "quote");

		expect(insert).toHaveBeenCalledWith("quote", {}, undefined, 1, true, true);
		expect(setToBlock).toHaveBeenCalledWith(1, "start");
	});

	it("goes after a written block and leaves it alone", () => {
		const { editor, insert } = editorWith([false, false]);

		insertBlock(editor, 0, "quote");

		expect(insert).toHaveBeenCalledWith("quote", {}, undefined, 1, true, false);
	});

	it("goes to the end when the editor never had the caret", () => {
		const { editor, insert } = editorWith([false, false]);

		insertBlock(editor, -1, "quote");

		expect(insert).toHaveBeenCalledWith("quote", {}, undefined, 2, true, false);
	});
});
