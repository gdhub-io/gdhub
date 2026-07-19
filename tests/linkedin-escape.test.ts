import { describe, expect, it } from "vitest";
import { escapeLinkedInText } from "@/services/linkedin";

describe("escapeLinkedInText", () => {
	it("escapes the characters LinkedIn treats as markup", () => {
		expect(escapeLinkedInText("SLM (Small Language Model): fast")).toBe(
			"SLM \\(Small Language Model\\): fast",
		);
		expect(escapeLinkedInText("a[b]c{d}e@f|g<h>i#j*k_l~m")).toBe(
			"a\\[b\\]c\\{d\\}e\\@f\\|g\\<h\\>i\\#j\\*k\\_l\\~m",
		);
	});

	it("escapes backslashes without double-processing the escapes it adds", () => {
		expect(escapeLinkedInText("a\\b(c)")).toBe("a\\\\b\\(c\\)");
	});

	it("leaves ordinary text, emoji and plain URLs untouched", () => {
		const text = "🚀 Update on project Blue Signal\nhttps://gdhub.io/devlog/abc123";
		expect(escapeLinkedInText(text)).toBe(text);
	});
});
