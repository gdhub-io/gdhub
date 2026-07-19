import { describe, expect, it } from "vitest";
import {
	type DevlogPostForMessage,
	devlogOgImage,
	devlogPostMessageDiscord,
	devlogPostMessageLinkedIn,
	devlogPostMessageTelegram,
} from "@/services/telegram/messages";

const makePost = (
	overrides: Partial<DevlogPostForMessage> = {},
): DevlogPostForMessage =>
	({
		id: "devlog-1",
		content: "",
		contentEditor: {
			blocks: [
				{
					type: "paragraph",
					data: {
						text: "This week we rewrote the level generator: sectors are now assembled from presets instead of pure random",
					},
				},
			],
		},
		project: { name: "Drain the Galaxy", coverImage: null },
		...overrides,
	}) as DevlogPostForMessage;

describe("devlog announce messages", () => {
	it("builds a Telegram HTML message with header, teaser, link and P.S.", () => {
		const message = devlogPostMessageTelegram(makePost());

		expect(message).toContain(
			"<b>Update on project Drain the Galaxy</b>",
		);
		expect(message).toContain("rewrote the level generator");
		expect(message).toContain(
			'<a href="https://gdhub.io/devlog/devlog-1">Read the devlog</a>',
		);
		expect(message).toContain("<i>P.S.");
	});

	it("escapes HTML in the project name for Telegram", () => {
		const message = devlogPostMessageTelegram(
			makePost({ project: { name: "A <b>& B", coverImage: null } }),
		);

		expect(message).toContain("A &lt;b&gt;&amp; B");
	});

	it("keeps the Discord message free of HTML tags", () => {
		const message = devlogPostMessageDiscord(
			makePost({ project: { name: "A <b>& B", coverImage: null } }),
		);

		expect(message).not.toMatch(/<\/?[a-z]/i);
		expect(message).toContain("**Update on project A <b>& B**");
		expect(message).toContain("https://gdhub.io/devlog/devlog-1");
	});

	it("keeps the LinkedIn message free of markup", () => {
		const message = devlogPostMessageLinkedIn(makePost());

		expect(message).not.toMatch(/<\/?[a-z]|\*\*/i);
		expect(message).toContain("Update on project Drain the Galaxy");
	});

	it("trims the teaser on a word boundary", () => {
		const long = `${"word ".repeat(200)}end`;
		const message = devlogPostMessageDiscord(
			makePost({
				contentEditor: {
					blocks: [{ type: "paragraph", data: { text: long } }],
				},
			} as Partial<DevlogPostForMessage>),
		);

		const teaser = message.split("\n\n")[1];
		expect(teaser.length).toBeLessThanOrEqual(301);
		expect(teaser.endsWith("…")).toBe(true);
		expect(teaser).not.toMatch(/wor…$/);
	});

	it("falls back to the project cover for the OG image", () => {
		const url = devlogOgImage(
			makePost({
				project: { name: "Drain the Galaxy", coverImage: "https://img/cover.png" },
			}),
		);

		expect(url).toContain("/api/og-blog?");
		expect(url).toContain("t=Drain+the+Galaxy");
		expect(url).toContain("u=gdhub.io%2Fdevlog");
		expect(url).toContain("img=https%3A%2F%2Fimg%2Fcover.png");
	});
});
