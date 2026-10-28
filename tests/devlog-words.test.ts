import { describe, expect, it } from "vitest";
import { devlogWords } from "@/lib/curator-text";

const editor = (blocks: object[]) => ({ content: "", contentEditor: { blocks } });

describe("devlogWords", () => {
	it("reads plain content as it is", () => {
		expect(devlogWords({ content: "Week 1: the greybox is in." })).toBe(
			"Week 1: the greybox is in.",
		);
	});

	it("reads a post written in the editor from its blocks, links kept", () => {
		const words = devlogWords(
			editor([
				{ type: "header", data: { text: "Week 2" } },
				{
					type: "paragraph",
					data: {
						text: 'The build is <b>up</b> on <a href="https://x.itch.io">itch.io</a>&nbsp;now.',
					},
				},
				{
					type: "list",
					data: { items: [{ content: "Tide timer", items: [{ content: "two minutes", items: [] }] }] },
				},
				{
					type: "checklist",
					data: { items: [{ text: "Lighthouse", checked: true }, { text: "Bridge", checked: false }] },
				},
				{ type: "table", data: { content: [["Player", "Time"], ["Ana", "9 min"]] } },
				{ type: "quote", data: { text: "Fun!", caption: "a tester" } },
				{
					type: "linkTool",
					data: { link: "https://docs.example/notes", meta: { title: "Playtest notes" } },
				},
				{ type: "embed", data: { source: "https://youtu.be/x", caption: "Build video" } },
				{ type: "image", data: { file: { url: "https://img/x.png" }, caption: "The bridge" } },
				{ type: "delimiter", data: {} },
			]),
		);
		expect(words.split("\n")).toEqual([
			"Week 2",
			"The build is up on itch.io (https://x.itch.io) now.",
			"- Tide timer",
			"  - two minutes",
			"[x] Lighthouse",
			"[ ] Bridge",
			"| Player | Time |",
			"| Ana | 9 min |",
			"> Fun!",
			"— a tester",
			"Playtest notes — https://docs.example/notes",
			"Build video — https://youtu.be/x",
			"Image: The bridge — https://img/x.png",
			"---",
		]);
	});

	it("is empty for an empty post", () => {
		expect(devlogWords({ content: "", contentEditor: null })).toBe("");
	});
});
