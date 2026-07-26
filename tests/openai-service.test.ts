import { beforeEach, describe, expect, it, vi } from "vitest";

// The service constructs the OpenAI client eagerly at import and reads
// OPENAI_API_KEY via env() — set it before the module loads.
vi.hoisted(() => {
	process.env.OPENAI_API_KEY = "test-key";
});

const chatCreate = vi.fn();

// Stub the OpenAI SDK so no network calls happen and we control responses.
vi.mock("openai", () => ({
	OpenAI: class {
		chat = { completions: { create: (...args: unknown[]) => chatCreate(...args) } };
		moderations = { create: vi.fn() };
		embeddings = { create: vi.fn() };
	},
}));

vi.mock("@/services/prisma", () => ({
	prisma: {
		workDirection: {
			findMany: vi.fn().mockResolvedValue([{ id: "d1", name: "other" }]),
		},
	},
}));

import { openAI } from "@/services/openai";

/** Build a modern chat.completions response carrying a function tool call. */
function toolResult(obj: unknown) {
	return {
		choices: [
			{
				message: {
					tool_calls: [
						{ type: "function", function: { arguments: JSON.stringify(obj) } },
					],
				},
			},
		],
	};
}

beforeEach(() => {
	chatCreate.mockReset();
});

describe("openAI.parseCV", () => {
	it("uses tools/tool_choice (not legacy functions) and parses the tool call", async () => {
		chatCreate.mockResolvedValue(
			toolResult({ summary: "s", specialization: "Gameplay programming" }),
		);

		const result = await openAI.parseCV("resume text", "Game Designer", {
			locale: "en",
		});

		expect(result).toEqual({ summary: "s", specialization: "Gameplay programming" });

		const callArg = chatCreate.mock.calls[0][0];
		expect(callArg.tools[0].type).toBe("function");
		expect(callArg.tools[0].function.name).toBe("parse_resume");
		expect(callArg.tool_choice).toEqual({
			type: "function",
			function: { name: "parse_resume" },
		});
		// Legacy params must be gone.
		expect(callArg.functions).toBeUndefined();
		expect(callArg.function_call).toBeUndefined();
	});

	it("returns undefined when the model returns no valid tool call", async () => {
		chatCreate.mockResolvedValue({ choices: [{ message: { tool_calls: [] } }] });

		const result = await openAI.parseCV("resume text", "Game Designer");
		expect(result).toBeUndefined();
	});
});

describe("openAI.matchingSpecAndProj", () => {
	it("parses scores from the modern tool call", async () => {
		chatCreate.mockResolvedValue(
			toolResult({ projectScore: 80, authorScore: 60, teamScore: 70, summary: "ok" }),
		);

		const result = await openAI.matchingSpecAndProj("spec text", "project text");

		expect(result).toEqual({
			projectScore: 80,
			authorScore: 60,
			teamScore: 70,
			summary: "ok",
		});

		const callArg = chatCreate.mock.calls[0][0];
		expect(callArg.tool_choice).toEqual({
			type: "function",
			function: { name: "parse_resume" },
		});
		expect(callArg.functions).toBeUndefined();
	});
});
