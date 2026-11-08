import { describe, expect, it } from "vitest";
import { lastActivity } from "@/lib/activity";
import {
	FEED_KIND_SOURCE,
	PROJECT_ACTIVITY,
} from "@/repositories/project/activity";

const at = (day: string) => new Date(`2026-${day}T00:00:00Z`);

describe("lastActivity", () => {
	it("takes the latest event across every kind, per subject", async () => {
		const latest = await lastActivity(
			{
				devlog: async () => [
					{ id: "a", at: at("09-01") },
					{ id: "b", at: at("10-01") },
				],
				stage: async () => [
					{ id: "a", at: at("11-01") },
					{ id: "b", at: null },
				],
			},
			["a", "b", "c"],
		);

		expect(latest).toEqual(
			new Map([
				["a", at("11-01")],
				["b", at("10-01")],
			]),
		);
	});

	it("asks no source when there are no subjects", async () => {
		const latest = await lastActivity(
			{ devlog: () => Promise.reject(new Error("queried")) },
			[],
		);

		expect(latest.size).toBe(0);
	});
});

describe("PROJECT_ACTIVITY", () => {
	// What keeps a project out of Dormant. A view is not on this list, and a
	// kind added here or dropped is a product decision, not a refactor.
	it("is exactly these kinds", () => {
		expect(Object.keys(PROJECT_ACTIVITY).sort()).toEqual([
			"artifact",
			"checkpoint",
			"created",
			"devlog",
			"edited",
			"equity",
			"stage",
			"statusChanged",
			"team",
		]);
	});

	it("counts every kind the activity feed shows", () => {
		for (const source of Object.values(FEED_KIND_SOURCE)) {
			expect(PROJECT_ACTIVITY).toHaveProperty(source);
		}
	});
});
