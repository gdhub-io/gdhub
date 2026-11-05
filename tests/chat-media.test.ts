import { describe, expect, it } from "vitest";
import { imageOf } from "@/components/Chat/model/timeline";
import { CHAT_IMAGE_MAX_BYTES, CHAT_IMAGE_MAX_SIDE } from "@/config/chat";
import {
	exceedsChatImageLimit,
	firstLink,
	fitWithin,
	needsShrink,
	parseLinkPreview,
	parseMxc,
	renameForType,
	textSegments,
} from "@/helpers/chat-media";
import { youTubeVideoId } from "@/helpers/video";

describe("youTubeVideoId", () => {
	it.each([
		["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
		["https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=42", "dQw4w9WgXcQ"],
		["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
		["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
		["https://www.youtube.com/embed/dQw4w9WgXcQ?start=10", "dQw4w9WgXcQ"],
		["https://www.youtube.com/live/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
		["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
		["https://youtu.be/dQw4w9WgXcQ?si=abc&t=5", "dQw4w9WgXcQ"],
	])("%s → %s", (url, id) => {
		expect(youTubeVideoId(url)).toBe(id);
	});

	it.each([
		"https://vimeo.com/123456789",
		"https://notyoutube.com/watch?v=dQw4w9WgXcQ",
		"https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
		"https://www.youtube.com/channel/UC1234567890",
		"https://www.youtube.com/watch?v=short",
		"https://youtu.be/",
	])("rejects %s", (url) => {
		expect(youTubeVideoId(url)).toBeNull();
	});
});

describe("textSegments / firstLink", () => {
	it("splits text around links and keeps every character", () => {
		const text = "See https://a.example/x and http://b.example/y!";
		const segments = textSegments(text);
		expect(segments).toEqual([
			{ type: "text", value: "See " },
			{ type: "link", value: "https://a.example/x" },
			{ type: "text", value: " and " },
			{ type: "link", value: "http://b.example/y" },
			{ type: "text", value: "!" },
		]);
		expect(segments.map((s) => s.value).join("")).toBe(text);
	});

	it("returns the first link only", () => {
		expect(firstLink("one https://a.example two https://b.example")).toBe(
			"https://a.example",
		);
	});

	it("leaves sentence punctuation outside the link", () => {
		expect(firstLink("Docs are here: https://docs.example/page.")).toBe(
			"https://docs.example/page",
		);
		expect(firstLink("(see https://a.example/x)")).toBe("https://a.example/x");
	});

	it("keeps balanced parentheses that belong to the URL", () => {
		expect(firstLink("https://en.wikipedia.org/wiki/Foo_(game) is")).toBe(
			"https://en.wikipedia.org/wiki/Foo_(game)",
		);
	});

	it("finds nothing in plain text or non-http schemes", () => {
		expect(firstLink("no links here")).toBeNull();
		expect(firstLink("ftp://files.example/a javascript:alert(1)")).toBeNull();
		expect(textSegments("")).toEqual([]);
	});
});

describe("fitWithin", () => {
	it("clamps the longest side and keeps the aspect", () => {
		expect(fitWithin(5120, 2880, CHAT_IMAGE_MAX_SIDE)).toEqual({
			width: 2560,
			height: 1440,
		});
		expect(fitWithin(3000, 6000, CHAT_IMAGE_MAX_SIDE)).toEqual({
			width: 1280,
			height: 2560,
		});
	});

	it("never scales up", () => {
		expect(fitWithin(800, 600, CHAT_IMAGE_MAX_SIDE)).toEqual({
			width: 800,
			height: 600,
		});
	});

	it("does not collapse an extreme strip to zero", () => {
		expect(fitWithin(100_000, 10, 280)).toEqual({ width: 280, height: 1 });
	});
});

describe("needsShrink / exceedsChatImageLimit", () => {
	it("skips images already within both limits", () => {
		expect(needsShrink(2560, 1440, 3_000_000, CHAT_IMAGE_MAX_SIDE)).toBe(false);
	});

	it("shrinks when a side or the size is over", () => {
		expect(needsShrink(2561, 100, 1000, CHAT_IMAGE_MAX_SIDE)).toBe(true);
		expect(
			needsShrink(1000, 1000, CHAT_IMAGE_MAX_BYTES + 1, CHAT_IMAGE_MAX_SIDE),
		).toBe(true);
	});

	it("refuses only above the server limit", () => {
		expect(exceedsChatImageLimit(CHAT_IMAGE_MAX_BYTES)).toBe(false);
		expect(exceedsChatImageLimit(CHAT_IMAGE_MAX_BYTES + 1)).toBe(true);
	});
});

describe("renameForType", () => {
	it("swaps the extension for the encoded type", () => {
		expect(renameForType("shot.final.png", "image/webp")).toBe(
			"shot.final.webp",
		);
		expect(renameForType("photo.HEIC", "image/jpeg")).toBe("photo.jpg");
		expect(renameForType("noext", "image/webp")).toBe("noext.webp");
	});
});

describe("parseLinkPreview", () => {
	it("keeps og fields and an mxc image", () => {
		expect(
			parseLinkPreview({
				"og:site_name": "itch.io",
				"og:title": "Hollow Tide",
				"og:description": "A puzzle adventure.",
				"og:image": "mxc://gdhub.io/AbC123",
			}),
		).toEqual({
			siteName: "itch.io",
			title: "Hollow Tide",
			description: "A puzzle adventure.",
			imageMxc: "mxc://gdhub.io/AbC123",
		});
	});

	it("drops an image that is not on our media server", () => {
		expect(
			parseLinkPreview({
				"og:title": "Trailer",
				"og:image": "https://i.ytimg.com/vi/x/hqdefault.jpg",
			})?.imageMxc,
		).toBeUndefined();
	});

	it("is null when there is neither a title nor an image", () => {
		expect(parseLinkPreview({})).toBeNull();
		expect(parseLinkPreview({ "og:description": "only this" })).toBeNull();
		expect(parseLinkPreview(null)).toBeNull();
	});
});

describe("parseMxc", () => {
	it("splits server and media id, refusing anything else", () => {
		expect(parseMxc("mxc://gdhub.io/AbC_12-3")).toEqual({
			serverName: "gdhub.io",
			mediaId: "AbC_12-3",
		});
		expect(parseMxc("mxc://gdhub.io/a/../b")).toBeNull();
		expect(parseMxc("https://gdhub.io/a")).toBeNull();
	});
});

describe("imageOf", () => {
	it("reads an m.image event", () => {
		expect(
			imageOf({
				msgtype: "m.image",
				body: "level.webp",
				url: "mxc://gdhub.io/abc",
				info: { w: 1600, h: 900, size: 120_000, mimetype: "image/webp" },
			}),
		).toEqual({
			mxc: "mxc://gdhub.io/abc",
			name: "level.webp",
			w: 1600,
			h: 900,
			size: 120_000,
			mimetype: "image/webp",
		});
	});

	it("tolerates missing or junk info", () => {
		expect(
			imageOf({
				msgtype: "m.image",
				body: "x",
				url: "mxc://s/a",
				info: { w: -1, h: "9" },
			}),
		).toEqual({ mxc: "mxc://s/a", name: "x" });
	});

	it("ignores text and encrypted or malformed images", () => {
		expect(imageOf({ msgtype: "m.text", body: "hi" })).toBeUndefined();
		expect(imageOf({ msgtype: "m.image", body: "x" })).toBeUndefined();
		expect(
			imageOf({ msgtype: "m.image", body: "x", url: "https://a/b" }),
		).toBeUndefined();
	});
});
