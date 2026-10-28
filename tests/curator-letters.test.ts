import { describe, expect, it } from "vitest";
import { lettersSoFar } from "@/lib/curator-letters";

describe("the curator's letters so far", () => {
	const sessions = [
		{ index: 3, content: { message: "Day 15 review." } },
		{
			index: 1,
			content: { message: "The check.", firstLetter: "Hello, I am Flint." },
		},
		{ index: 2, content: { message: "Day 8 review." } },
		// A pro curator's call notes carry no letter.
		{ index: 4, content: { inShort: "Call notes." } },
		{ index: 5, content: null },
	];

	it("reads day 1's two letters, then one a review, in order", () => {
		expect(lettersSoFar(sessions)).toEqual([
			{ day: 1, text: "Hello, I am Flint." },
			{ day: 1, text: "The check." },
			{ day: 8, text: "Day 8 review." },
			{ day: 15, text: "Day 15 review." },
		]);
	});

	it("stops before the letter being written", () => {
		expect(lettersSoFar(sessions, 3).map((letter) => letter.day)).toEqual([
			1, 1, 8,
		]);
	});

	it("reads the plan's letter after the check, once the plan is approved", () => {
		const approved = [
			{
				index: 1,
				content: {
					message: "The check.",
					firstLetter: "Hello.",
					planLetter: "The plan is ready, set out.",
				},
			},
		];
		expect(lettersSoFar(approved).map((letter) => letter.text)).toEqual([
			"Hello.",
			"The check.",
			"The plan is ready, set out.",
		]);
	});
});
