import { beforeEach, describe, expect, it, vi } from "vitest";

// The service talks to OpenAI (moderation + a chat completion). Mock the shared
// client so we can drive both responses and assert the merge / severity logic.
const moderationCreate = vi.fn();
const chatCreate = vi.fn();

vi.mock("@/services/openai", () => ({
	openAI: {
		openai: {
			moderations: { create: (...args: unknown[]) => moderationCreate(...args) },
			chat: {
				completions: {
					create: (...args: unknown[]) => chatCreate(...args),
				},
			},
		},
	},
}));

import { aiValidation, type FieldInput } from "@/services/ai-validation";

function cleanModeration() {
	moderationCreate.mockImplementation(async ({ input }: { input: string[] }) => ({
		results: input.map(() => ({ flagged: false, categories: {} })),
	}));
}

function relevance(verdicts: unknown[]) {
	chatCreate.mockResolvedValue({
		choices: [
			{
				message: {
					tool_calls: [
						{
							type: "function",
							function: { arguments: JSON.stringify({ fields: verdicts }) },
						},
					],
				},
			},
		],
	});
}

beforeEach(() => {
	moderationCreate.mockReset();
	chatCreate.mockReset();
	delete process.env.AI_VALIDATION_ENABLED;
});

describe("aiValidation.validate", () => {
	it("passes clean, relevant content with no issues", async () => {
		cleanModeration();
		relevance([{ key: "name", relevant: true, reason: "ok" }]);

		const result = await aiValidation.validate([
			{ key: "name", value: "Game Designer", kind: "speciality" },
		]);

		expect(result.ok).toBe(true);
		expect(result.issues).toHaveLength(0);
	});

	it("blocks offensive content as an error regardless of field kind", async () => {
		moderationCreate.mockImplementation(async ({ input }: { input: string[] }) => ({
			results: input.map((_v, i) =>
				i === 0
					? { flagged: true, categories: { harassment: true } }
					: { flagged: false, categories: {} },
			),
		}));
		relevance([]);

		const result = await aiValidation.validate([
			{ key: "name", value: "some slur", kind: "person_name" }, // kind defaults to warning
			{ key: "bio", value: "hello", kind: "freeform" },
		]);

		expect(result.ok).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]).toMatchObject({
			key: "name",
			reason: "moderation",
			severity: "error",
			categories: ["harassment"],
		});
	});

	it("blocks irrelevant required fields but only warns on soft fields", async () => {
		cleanModeration();
		relevance([
			{ key: "spec", relevant: false, reason: "irrelevant" },
			{ key: "who", relevant: false, reason: "gibberish" },
		]);

		const fields: FieldInput[] = [
			{ key: "spec", value: "I love swimming", kind: "speciality" }, // error kind
			{ key: "who", value: "asdf", kind: "person_name" }, // warning kind
		];
		const result = await aiValidation.validate(fields);

		expect(result.ok).toBe(false);
		expect(result.errors.map((e) => e.key)).toEqual(["spec"]);
		expect(result.warnings.map((w) => w.key)).toEqual(["who"]);
		expect(result.warnings[0].reason).toBe("gibberish");
	});

	it("lets a per-field severity override the default", async () => {
		cleanModeration();
		relevance([{ key: "spec", relevant: false, reason: "irrelevant" }]);

		const result = await aiValidation.validate([
			{ key: "spec", value: "random", kind: "speciality", severity: "warning" },
		]);

		expect(result.ok).toBe(true);
		expect(result.warnings).toHaveLength(1);
	});

	it("fails open when moderation throws (never blocks the user)", async () => {
		moderationCreate.mockRejectedValue(new Error("openai down"));
		relevance([{ key: "name", relevant: true, reason: "ok" }]);

		const result = await aiValidation.validate([
			{ key: "name", value: "Composer", kind: "speciality" },
		]);

		expect(result.ok).toBe(true);
		expect(result.issues).toHaveLength(0);
	});

	it("ignores empty fields and makes no API calls when nothing to check", async () => {
		const result = await aiValidation.validate([
			{ key: "name", value: "   ", kind: "speciality" },
		]);

		expect(result.ok).toBe(true);
		expect(moderationCreate).not.toHaveBeenCalled();
		expect(chatCreate).not.toHaveBeenCalled();
	});

	it("is a no-op when disabled via env flag", async () => {
		process.env.AI_VALIDATION_ENABLED = "false";

		const result = await aiValidation.validate([
			{ key: "name", value: "anything", kind: "speciality" },
		]);

		expect(result.ok).toBe(true);
		expect(moderationCreate).not.toHaveBeenCalled();
		expect(chatCreate).not.toHaveBeenCalled();
	});
});
