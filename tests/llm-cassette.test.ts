import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const root = mkdtempSync(path.join(tmpdir(), "cassettes-"));
let cassette: typeof import("@/services/ai/cassette");

beforeAll(async () => {
	vi.spyOn(process, "cwd").mockReturnValue(root);
	cassette = await import("@/services/ai/cassette");
});

afterEach(() => vi.unstubAllEnvs());

const onStand = (mode: string) => {
	vi.stubEnv("NODE_ENV", "test");
	vi.stubEnv("E2E_TEST_AUTH", "1");
	vi.stubEnv("LLM_CASSETTES", mode);
};

describe("where cassettes answer", () => {
	it("never in the app the team uses: the stand's own flag is required", () => {
		vi.stubEnv("LLM_CASSETTES", "auto");
		vi.stubEnv("E2E_TEST_AUTH", "");
		expect(cassette.cassetteMode()).toBeNull();
	});

	it("never in production, even with every flag set", () => {
		onStand("auto");
		vi.stubEnv("NODE_ENV", "production");
		expect(cassette.cassetteMode()).toBeNull();
	});

	it("calls the real model whenever they are off", async () => {
		vi.stubEnv("E2E_TEST_AUTH", "");
		const call = vi.fn(async () => "live");

		await expect(cassette.withCassette("x", { a: 1 }, call)).resolves.toBe("live");
		await expect(cassette.withCassette("x", { a: 1 }, call)).resolves.toBe("live");
		expect(call).toHaveBeenCalledTimes(2);
	});
});

describe("on the stand", () => {
	it("records once, then answers from the recording", async () => {
		onStand("auto");
		const call = vi.fn(async () => ({ text: "recorded" }));

		await cassette.withCassette("review", { prompt: "day 8" }, call);
		const again = await cassette.withCassette("review", { prompt: "day 8" }, call);

		expect(again).toEqual({ text: "recorded" });
		expect(call).toHaveBeenCalledOnce();
		expect(readdirSync(path.join(root, "tests/e2e/cassettes"))).toHaveLength(1);
	});

	it("asks the model once for two identical calls at the same time", async () => {
		onStand("auto");
		const call = vi.fn(
			() => new Promise<string>((done) => setTimeout(() => done("one"), 10)),
		);

		const both = await Promise.all([
			cassette.withCassette("letter", { prompt: "day 1" }, call),
			cassette.withCassette("letter", { prompt: "day 1" }, call),
		]);

		expect(both).toEqual(["one", "one"]);
		expect(call).toHaveBeenCalledOnce();
	});

	it("fails a missing recording in replay rather than calling the model", async () => {
		onStand("replay");
		const call = vi.fn(async () => "live");

		await expect(
			cassette.withCassette("review", { prompt: "never recorded" }, call),
		).rejects.toThrow(/No LLM cassette/);
		expect(call).not.toHaveBeenCalled();
	});

	it("keys a prompt without what changes from run to run", () => {
		const one = cassette.normalizeForKey(
			'{"id":"cmvteb2j3006d5qz8kbdqrlsz","at":"2026-10-29T10:41:14.000Z","day":"29 Oct","email":"author-b4-mvte2kz9@example.com","slug":"/project/tidebound-3/"}',
		);
		const two = cassette.normalizeForKey(
			'{"id":"cmwzz0000000000000000abcd","at":"2026-11-30T08:01:02.000Z","day":"30 Nov","email":"author-b4-mw01ab23@example.com","slug":"/project/tidebound-7/"}',
		);
		expect(one).toBe(two);
		expect(cassette.normalizeForKey("Day 15 of 28")).toBe("Day 15 of 28");
	});
});
