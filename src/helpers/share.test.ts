import { describe, expect, it } from "vitest";
import { SHARE_NETWORKS, shareIntentUrl } from "./share";

const post = {
	url: "https://gdhub.io/devlog/abc?ref=a&b=1",
	text: "E2E Test Game: 50% done & counting",
};

describe("shareIntentUrl", () => {
	it("carries the link intact through every network's intent", () => {
		for (const network of SHARE_NETWORKS) {
			const intent = new URL(shareIntentUrl(network, post));
			const link =
				intent.searchParams.get("url") ?? intent.searchParams.get("u");

			expect(link, network).toBe(post.url);
		}
	});

	it("keeps the text out of the link's own query", () => {
		const intent = new URL(shareIntentUrl("x", post));

		expect(intent.searchParams.get("text")).toBe(post.text);
		expect([...intent.searchParams.keys()].sort()).toEqual(["text", "url"]);
	});

	it("sends LinkedIn and Facebook the link alone", () => {
		expect(shareIntentUrl("linkedin", post)).not.toContain("Test");
		expect(shareIntentUrl("facebook", post)).not.toContain("Test");
	});
});
