import { describe, expect, it } from "vitest";
import { SPRINTS_PER_CHECKPOINT } from "@/config/checkpoint";
import { teamCapacity } from "@/lib/checkpoints/capacity";

describe("teamCapacity", () => {
	it("sums the stated ranges and carries them over the four sprints", () => {
		const capacity = teamCapacity([
			{ timeForWork: [10, 20] },
			{ timeForWork: [5, 8] },
		]);

		expect(capacity).toEqual({
			members: 2,
			stated: 2,
			hoursPerWeek: { from: 15, to: 28 },
			hoursPerRun: {
				from: 15 * SPRINTS_PER_CHECKPOINT,
				to: 28 * SPRINTS_PER_CHECKPOINT,
			},
		});
	});

	it("counts a member who stated nothing without counting them as zero hours", () => {
		const capacity = teamCapacity([
			{ timeForWork: [10, 20] },
			{ timeForWork: [] },
			{ timeForWork: null },
		]);

		expect(capacity.members).toBe(3);
		expect(capacity.stated).toBe(1);
		expect(capacity.hoursPerWeek).toEqual({ from: 10, to: 20 });
	});

	it("has no totals at all when nobody stated anything", () => {
		const capacity = teamCapacity([{ timeForWork: [] }, {}]);

		expect(capacity).toMatchObject({
			members: 2,
			stated: 0,
			hoursPerWeek: null,
			hoursPerRun: null,
		});
	});

	it("reads a single figure as a range and a backwards range as a range", () => {
		expect(teamCapacity([{ timeForWork: [12] }]).hoursPerWeek).toEqual({
			from: 12,
			to: 12,
		});
		expect(teamCapacity([{ timeForWork: [20, 10] }]).hoursPerWeek).toEqual({
			from: 10,
			to: 20,
		});
	});

	it("says nothing about an empty team beyond its being empty", () => {
		expect(teamCapacity([])).toMatchObject({
			members: 0,
			hoursPerWeek: null,
			hoursPerRun: null,
		});
	});
});
