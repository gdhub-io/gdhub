import { describe, expect, it } from "vitest";
import { checkpointSignals, type SignalsInput } from "@/lib/checkpoints/signals";

const startedAt = new Date("2026-09-01T00:00:00.000Z");
// Day 10 — inside sprint 2, which runs 8–14 September.
const onDay10 = new Date("2026-09-10T12:00:00.000Z");

const input = (patch: Partial<SignalsInput> = {}): SignalsInput => ({
	startedAt,
	reports: [],
	pulses: [],
	members: [],
	outcomes: [],
	...patch,
});

describe("checkpointSignals", () => {
	it("gives a draft no band at all", () => {
		expect(checkpointSignals(input({ startedAt: null }), onDay10)).toBeNull();
	});

	it("counts a devlog once per sprint, however many were written in it", () => {
		const signals = checkpointSignals(
			input({
				reports: [
					{ publishedAt: new Date("2026-09-05T09:00:00.000Z") },
					{ publishedAt: new Date("2026-09-06T09:00:00.000Z") },
					{ publishedAt: new Date("2026-09-12T09:00:00.000Z") },
				],
			}),
			onDay10,
		);

		expect(signals?.devlogs).toEqual({ done: 2, total: 4 });
	});

	it("ignores a devlog published outside the 28 days", () => {
		const signals = checkpointSignals(
			input({
				reports: [
					{ publishedAt: new Date("2026-08-30T09:00:00.000Z") },
					{ publishedAt: new Date("2026-10-05T09:00:00.000Z") },
				],
			}),
			onDay10,
		);

		expect(signals?.devlogs.done).toBe(0);
	});

	it("counts only the pulses of the sprint under way", () => {
		const signals = checkpointSignals(
			input({
				pulses: [
					{ week: 1, confirmedAt: new Date("2026-09-03T09:00:00.000Z") },
					{ week: 2, confirmedAt: new Date("2026-09-09T09:00:00.000Z") },
					{ week: 2, confirmedAt: null },
				],
				members: [
					{ startedAt: new Date("2026-08-01T00:00:00.000Z"), finishedAt: null },
					{ startedAt: new Date("2026-08-01T00:00:00.000Z"), finishedAt: null },
				],
			}),
			onDay10,
		);

		expect(signals?.pulses).toEqual({ done: 1, total: 2 });
	});

	it("does not ask someone who joined after the sprint or left before it", () => {
		const signals = checkpointSignals(
			input({
				members: [
					{ startedAt: new Date("2026-08-01T00:00:00.000Z"), finishedAt: null },
					// Joined in sprint 3.
					{ startedAt: new Date("2026-09-20T00:00:00.000Z"), finishedAt: null },
					// Left during sprint 1.
					{
						startedAt: new Date("2026-08-01T00:00:00.000Z"),
						finishedAt: new Date("2026-09-04T00:00:00.000Z"),
					},
				],
			}),
			onDay10,
		);

		expect(signals?.pulses.total).toBe(1);
	});

	it("counts evidence against the outcomes that are still standing", () => {
		const signals = checkpointSignals(
			input({
				outcomes: [
					{ cut: false, hasArtifact: true },
					{ cut: false, hasArtifact: false },
					{ cut: true, hasArtifact: false },
				],
			}),
			onDay10,
		);

		expect(signals?.evidence).toEqual({ done: 1, total: 2 });
	});
});
