import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchBody } from "@/services/artifact-check/safe-fetch";
import { type NotionBlocks, notionPage, notionText } from "@/services/evidence/notion";
import { readEvidence } from "@/services/evidence/read";
import { readViaWebSearch } from "@/services/evidence/web-read";

vi.mock("@/services/artifact-check/safe-fetch", () => ({ fetchBody: vi.fn() }));
vi.mock("@/services/evidence/web-read", () => ({ readViaWebSearch: vi.fn(async () => null) }));

const PAGE = "2866fc3c-973e-80ee-b38b-d5e08c8f9c3b";

const answer = (contentType: string, text: string) => ({
	ok: true as const,
	body: {
		contentType,
		bytes: new TextEncoder().encode(text),
		url: "https://example.com/x",
	},
});

const blk = (id: string, type: string, extra: Record<string, unknown> = {}) => ({
	// The newer, doubly wrapped record format Notion serves today.
	[id]: { value: { value: { id, type, ...extra } } },
});
const title = (text: string) => ({ properties: { title: [[text]] } });

const blocks: NotionBlocks = {
	...blk(PAGE, "page", {
		...title("Concept"),
		content: ["h", "cols", "n1", "n2", "todo", "tbl", "img", "sub", "tg"],
	}),
	...blk("h", "sub_header", title("Core loop")),
	...blk("cols", "column_list", { content: ["c1", "c2"] }),
	...blk("c1", "column", { content: ["t1"] }),
	...blk("c2", "column", { content: ["b1"] }),
	...blk("t1", "text", {
		properties: { title: [["Mine "], ["ore", [["b"]]], [", build."]] },
	}),
	...blk("b1", "bulleted_list", { ...title("Robots"), content: ["b2"] }),
	...blk("b2", "bulleted_list", title("Drill bot")),
	...blk("n1", "numbered_list", title("First")),
	...blk("n2", "numbered_list", title("Second")),
	...blk("todo", "to_do", { properties: { title: [["Ship demo"]], checked: [["Yes"]] } }),
	...blk("tbl", "table", {
		content: ["r1"],
		format: { table_block_column_order: ["a", "b"] },
	}),
	...blk("r1", "table_row", { properties: { a: [["HP"]], b: [["100"]] } }),
	...blk("img", "image", {}),
	...blk("sub", "page", { ...title("Lore"), content: ["secret"] }),
	...blk("secret", "text", title("Hidden lore text")),
	...blk("tg", "toggle", { ...title("FAQ"), content: ["ans"] }),
	...blk("ans", "text", title("Yes, co-op.")),
};

beforeEach(() => vi.clearAllMocks());

describe("Notion page links", () => {
	it.each([
		[
			"https://meowing-charger-7b5.notion.site/Concept-2866fc3c973e80eeb38bd5e08c8f9c3b",
			"https://meowing-charger-7b5.notion.site/api/v3/loadPageChunk",
		],
		[
			"https://team.notion.site/2866fc3c973e80eeb38bd5e08c8f9c3b?pvs=4",
			"https://team.notion.site/api/v3/loadPageChunk",
		],
		[
			"https://www.notion.so/team/Concept-2866fc3c-973e-80ee-b38b-d5e08c8f9c3b",
			"https://www.notion.so/api/v3/loadPageChunk",
		],
		[
			"https://notion.so/2866FC3C973E80EEB38BD5E08C8F9C3B#heading",
			"https://www.notion.so/api/v3/loadPageChunk",
		],
		[
			"https://www.notion.so/team/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa?v=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb&p=2866fc3c973e80eeb38bd5e08c8f9c3b",
			"https://www.notion.so/api/v3/loadPageChunk",
		],
	])("%s is the page read through %s", (link, api) => {
		expect(notionPage(link)).toEqual({ api, pageId: PAGE });
	});

	it.each([
		"https://www.notion.so/pricing",
		"https://evil.example/notion.site/2866fc3c973e80eeb38bd5e08c8f9c3b",
		"https://notion.site.evil.example/2866fc3c973e80eeb38bd5e08c8f9c3b",
		"not a link",
	])("%s is not a Notion page", (link) => {
		expect(notionPage(link)).toBeNull();
	});
});

describe("a Notion page as text", () => {
	it("reads the page's blocks in order, not its sub-pages", () => {
		const { text, images } = notionText(blocks, PAGE);

		expect(text).toBe(
			[
				"Page title: Concept",
				"## Core loop",
				"Mine ore, build.",
				"- Robots",
				"  - Drill bot",
				"1. First",
				"2. Second",
				"[x] Ship demo",
				"| HP | 100 |",
				"Sub-page (not read): Lore",
				"▸ FAQ",
				"  Yes, co-op.",
			].join("\n"),
		);
		expect(text).not.toContain("Hidden lore");
		expect(images).toBe(1);
	});

	it("follows the cursor through every chunk", async () => {
		const [first, second] = [
			Object.fromEntries(Object.entries(blocks).slice(0, 5)),
			Object.fromEntries(Object.entries(blocks).slice(5)),
		];
		vi.mocked(fetchBody)
			.mockResolvedValueOnce(
				answer(
					"application/json",
					JSON.stringify({ cursor: { stack: [[{ id: PAGE }]] }, recordMap: { block: first } }),
				),
			)
			.mockResolvedValueOnce(
				answer(
					"application/json",
					JSON.stringify({ cursor: { stack: [] }, recordMap: { block: second } }),
				),
			);

		const read = await readEvidence(
			"https://team.notion.site/Concept-2866fc3c973e80eeb38bd5e08c8f9c3b",
			{ videoSecondsLeft: 600 },
		);

		expect(fetchBody).toHaveBeenCalledTimes(2);
		expect(vi.mocked(fetchBody).mock.calls[1][3]).toMatchObject({
			pageId: PAGE,
			chunkNumber: 1,
			cursor: { stack: [[{ id: PAGE }]] },
		});
		expect(read.text).toContain("Yes, co-op.");
		expect(read.unread).toContain("images and videos (1)");
	});

	it("says so when the page is not shared to the web", async () => {
		vi.mocked(fetchBody).mockResolvedValue(
			answer("application/json", JSON.stringify({ cursor: { stack: [] }, recordMap: {} })),
		);

		const read = await readEvidence(
			"https://www.notion.so/2866fc3c973e80eeb38bd5e08c8f9c3b",
			{ videoSecondsLeft: 600 },
		);

		expect(read.text).toBeNull();
		expect(read.unread).toContain("not shared");
	});
});

describe("a page that renders with JavaScript", () => {
	it("is unread, not read as its title", async () => {
		vi.mocked(fetchBody).mockResolvedValue(
			answer(
				"text/html",
				'<html><head><title>Notion</title><script>boot()</script></head><body><div id="root"></div><noscript>Enable JavaScript</noscript></body></html>',
			),
		);

		const read = await readEvidence("https://app.example.com/doc", {
			videoSecondsLeft: 600,
		});

		expect(read.text).toBeNull();
		expect(read.unread).toContain("renders with JavaScript");
	});
});

describe("a page our reader cannot read", () => {
	it("is read through web search, marked as a transcription with its sources", async () => {
		vi.mocked(fetchBody).mockResolvedValueOnce({
			ok: true,
			body: {
				contentType: "text/html",
				bytes: new TextEncoder().encode("<html><title>App</title><body><div id=root></div></body></html>"),
			},
		} as never);
		vi.mocked(readViaWebSearch).mockResolvedValueOnce({
			text: "Blue Signal — a 2D adventure",
			sources: ["https://example.com/page"],
		});

		const read = await readEvidence("https://example.com/page", { videoSecondsLeft: 0 });

		expect(read.unread).toBeNull();
		expect(read.text).toContain("transcription of the page");
		expect(read.text).toContain("Blue Signal — a 2D adventure");
		expect(read.text).toContain("Sources: https://example.com/page");
	});

	it("stays unread with our own reason when web search cannot open it either", async () => {
		vi.mocked(fetchBody).mockResolvedValueOnce({ ok: false, reason: "needsLogin" } as never);

		const read = await readEvidence("https://example.com/private", { videoSecondsLeft: 0 });

		expect(read.text).toBeNull();
		expect(read.unread).toBe("the link asks for a login");
	});

	it.each(["unsafe", "unreachable"])(
		"is not retried through web search when the link can never be read (%s)",
		async (reason) => {
			vi.mocked(fetchBody).mockResolvedValueOnce({ ok: false, reason } as never);
			vi.mocked(readViaWebSearch).mockClear();

			await readEvidence("http://10.0.0.1/", { videoSecondsLeft: 0 });

			expect(readViaWebSearch).not.toHaveBeenCalled();
		},
	);
});
