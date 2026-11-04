import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import { describe, expect, it } from "vitest";
import { safeMarkdownRehypePlugins } from "@/lib/content/safe-markdown";
import {
	safeUrl,
	sanitizeEditorJsData,
	sanitizeHtml,
} from "@/lib/content/sanitize-html";

describe("sanitizeHtml", () => {
	it("drops scripts with their content", () => {
		expect(sanitizeHtml("Hi<script>alert(1)</script> there")).toBe(
			"Hi there",
		);
	});

	it("drops event handlers and style", () => {
		expect(
			sanitizeHtml('<b onclick="x()" style="color:red">bold</b><img src=x onerror="alert(1)">'),
		).toBe("<b>bold</b>");
	});

	it("drops javascript: links but keeps the text", () => {
		expect(sanitizeHtml('<a href="javascript:alert(1)">click</a>')).toBe(
			"<a>click</a>",
		);
		expect(sanitizeHtml('<a href="JaVaScRiPt:alert(1)">x</a>')).toBe("<a>x</a>");
	});

	it("drops iframes", () => {
		expect(sanitizeHtml('<iframe src="https://evil.example"></iframe>ok')).toBe(
			"ok",
		);
	});

	it("keeps the formatting editor.js produces", () => {
		const html =
			'<b>b</b> <i>i</i> <u>u</u> <mark class="cdx-marker">m</mark> <code class="inline-code">c</code><br /><a href="https://gdhub.io">link</a>';
		expect(sanitizeHtml(html)).toBe(
			'<b>b</b> <i>i</i> <u>u</u> <mark class="cdx-marker">m</mark> <code class="inline-code">c</code><br /><a href="https://gdhub.io">link</a>',
		);
	});

	it("keeps lists and drops unknown classes", () => {
		expect(sanitizeHtml('<ul class="evil"><li>one</li></ul>')).toBe(
			"<ul><li>one</li></ul>",
		);
	});

	it("protects a new-tab link from the opened page", () => {
		expect(
			sanitizeHtml('<a href="https://x.io" target="_blank" rel="opener">x</a>'),
		).toBe('<a href="https://x.io" target="_blank" rel="noopener noreferrer">x</a>');
	});

	it("keeps relative and mailto links, drops protocol-relative ones", () => {
		expect(sanitizeHtml('<a href="/p/1">a</a><a href="mailto:a@b.io">m</a>')).toBe(
			'<a href="/p/1">a</a><a href="mailto:a@b.io">m</a>',
		);
		expect(sanitizeHtml('<a href="//evil.example">x</a>')).toBe("<a>x</a>");
	});

	it("keeps an attribute only on the tag allowed to carry it", () => {
		expect(
			sanitizeHtml('<span class="cdx-marker" href="https://x.io">s</span><mark class="cdx-marker evil">m</mark>'),
		).toBe('<span>s</span><mark class="cdx-marker">m</mark>');
	});
});

describe("safeUrl", () => {
	it.each([
		["https://gdhub.io/a", "https://gdhub.io/a"],
		["http://example.com", "http://example.com"],
		["/images/a.png", "/images/a.png"],
		["javascript:alert(1)", ""],
		["data:text/html,<script>alert(1)</script>", ""],
		["//evil.example/x", ""],
		["not a url", ""],
	])("%s → %s", (input, expected) => {
		expect(safeUrl(input)).toBe(expected);
	});
});

describe("sanitizeEditorJsData", () => {
	it("cleans every HTML field and every URL, leaving the rest alone", () => {
		const data = {
			time: 1,
			version: "2.31.0",
			blocks: [
				{
					type: "paragraph",
					data: { text: '<b>ok</b><img src=x onerror="alert(1)">' },
				},
				{ type: "header", data: { text: "<script>x</script>Title", level: 2 } },
				{
					type: "list",
					data: {
						style: "unordered",
						items: [
							"<i>one</i><svg onload=alert(1)>",
							{ content: '<a href="javascript:x">two</a>', items: [] },
						],
					},
				},
				{
					type: "table",
					data: { content: [["<b>a</b>", '<span onclick="x">b</span>']] },
				},
				{
					type: "embed",
					data: {
						embed: "javascript:alert(1)",
						source: "https://youtu.be/x",
						caption: "<u>cap</u>",
					},
				},
				{
					type: "linkTool",
					data: {
						link: "javascript:alert(1)",
						meta: { title: "T", image: { url: "https://cdn.sanity.io/a.png" } },
					},
				},
				{
					type: "image",
					data: { file: { url: "https://cdn.sanity.io/b.png" }, caption: "c" },
				},
			],
		};

		expect(sanitizeEditorJsData(data)).toEqual({
			time: 1,
			version: "2.31.0",
			blocks: [
				{ type: "paragraph", data: { text: "<b>ok</b>" } },
				{ type: "header", data: { text: "Title", level: 2 } },
				{
					type: "list",
					data: {
						style: "unordered",
						items: ["<i>one</i>", { content: "<a>two</a>", items: [] }],
					},
				},
				{
					type: "table",
					data: { content: [["<b>a</b>", "<span>b</span>"]] },
				},
				{
					type: "embed",
					data: {
						embed: "",
						source: "https://youtu.be/x",
						caption: "<u>cap</u>",
					},
				},
				{
					type: "linkTool",
					data: {
						link: "",
						meta: { title: "T", image: { url: "https://cdn.sanity.io/a.png" } },
					},
				},
				{
					type: "image",
					data: { file: { url: "https://cdn.sanity.io/b.png" }, caption: "c" },
				},
			],
		});
	});
});

describe("safeMarkdownRehypePlugins", () => {
	const render = (markdown: string) =>
		renderToStaticMarkup(
			createElement(
				ReactMarkdown,
				{ rehypePlugins: safeMarkdownRehypePlugins },
				markdown,
			),
		);

	it("removes scripts, handlers, style and javascript: links from raw HTML", () => {
		const html = render(
			'Hi <script>alert(1)</script><img src="x" onerror="alert(1)"><div style="color:red">box</div> <a href="javascript:alert(1)">a</a>',
		);
		expect(html).not.toMatch(/script|onerror|style=|javascript:/i);
		expect(html).toContain("box");
	});

	it("removes iframes", () => {
		expect(render('<iframe src="https://evil.example"></iframe>')).not.toContain(
			"iframe",
		);
	});

	it("keeps markdown and inline formatting", () => {
		const html = render(
			'## Title\n\n- **bold** and <u>under</u> <mark>hi</mark>\n\n<a href="https://gdhub.io" target="_blank">site</a>',
		);
		expect(html).toContain("<h2>Title</h2>");
		expect(html).toContain("<strong>bold</strong>");
		expect(html).toContain("<u>under</u>");
		expect(html).toContain("<mark>hi</mark>");
		expect(html).toContain('<a href="https://gdhub.io" target="_blank">site</a>');
	});
});
