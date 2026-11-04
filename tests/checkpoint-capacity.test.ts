import { describe, expect, it } from "vitest";
import { SPRINTS_PER_CHECKPOINT } from "@/config/checkpoint";
import { hoursLeft, teamCapacity } from "@/lib/checkpoints/capacity";
import { renderTeam } from "@/services/checkpoints/ai-curator/prompts/card";

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

describe("hoursLeft", () => {
	const week = { from: 30, to: 40 };

	it("narrows sprint by sprint at the hours stated now", () => {
		expect([0, 1, 3, 4].map((done) => hoursLeft(week, done))).toEqual([
			{ from: 120, to: 160, sprints: 4 },
			{ from: 90, to: 120, sprints: 3 },
			{ from: 30, to: 40, sprints: 1 },
			{ from: 0, to: 0, sprints: 0 },
		]);
	});

	it("follows a cut in someone's hours: fewer a week, fewer left", () => {
		expect(hoursLeft({ from: 20, to: 30 }, 2)).toEqual({ from: 40, to: 60, sprints: 2 });
	});

	it("is unknown, not zero, when nobody stated hours", () => {
		expect(hoursLeft(null, 1)).toBeNull();
	});
});

describe("renderTeam with the time left", () => {
	const team = {
		...teamCapacity([{ timeForWork: [15, 20] }, { timeForWork: [5, 10] }]),
		people: [],
		openings: [],
	};

	it("tells the model the hours left after the sprint reviewed", () => {
		expect(renderTeam(team, 1)).toContain(
			"Time left: about 60–90 hours over the 3 sprints ahead",
		);
	});

	it("says nothing about time left where no sprint is given", () => {
		expect(renderTeam(team)).not.toContain("Time left");
	});
});
