import { describe, expect, it } from "vitest";
import { AdvisorAvailabilityStatus } from "@/config/prisma-enums";
import {
	type Availability,
	type AvailabilityRule,
	callsOutside,
	earliestFirstCall,
	freeFirstCalls,
	rangesOn,
	takesCheckpoints,
} from "@/lib/advisor-availability";

const hours = (from: number, to: number) => ({ from: from * 60, to: to * 60 });

const rule = (overrides: Partial<AvailabilityRule> = {}): AvailabilityRule => ({
	monthFrom: null,
	monthTo: null,
	weekdays: [3],
	ranges: [hours(9, 13)],
	forConsultations: true,
	forCheckpoints: true,
	...overrides,
});

// Monday 12 Oct 2026, 10:00 UTC.
const now = new Date("2026-10-12T10:00:00Z");

const availability = (overrides: Partial<Availability> = {}): Availability => ({
	timeZone: "Europe/Lisbon",
	status: AdvisorAvailabilityStatus.Open,
	awayUntil: null,
	confirmedAt: new Date("2026-10-01T00:00:00Z"),
	rules: [rule()],
	...overrides,
});

const iso = (dates: Date[]) => dates.map((date) => date.toISOString());

describe("rangesOn", () => {
	const weekly = rule({ weekdays: [1, 2, 3, 4, 5], ranges: [hours(9, 13)] });
	const spring = rule({
		monthFrom: "2027-01-01",
		monthTo: "2027-08-31",
		weekdays: [1, 2, 3, 4, 5],
		ranges: [hours(10, 14)],
	});
	const july = rule({
		monthFrom: "2027-07-01",
		monthTo: "2027-07-31",
		weekdays: [1, 2],
		ranges: [hours(15, 18)],
	});

	it("reads the weekly hours outside every period", () => {
		expect(rangesOn([weekly, spring], "2026-12-02", "checkpoints")).toEqual([
			hours(9, 13),
		]);
	});

	it("lets a period replace the weekly hours in its months", () => {
		expect(rangesOn([weekly, spring], "2027-03-03", "checkpoints")).toEqual([
			hours(10, 14),
		]);
	});

	it("lets the shorter period decide its whole days, weekdays it leaves out too", () => {
		// A Wednesday in July: July covers Mon–Tue only, so Wednesday is closed.
		expect(rangesOn([weekly, spring, july], "2027-07-07", "checkpoints")).toEqual(
			[],
		);
		expect(rangesOn([weekly, spring, july], "2027-07-06", "checkpoints")).toEqual(
			[hours(15, 18)],
		);
	});

	it("keeps hours to the activities they are open for", () => {
		const consultations = rule({ forCheckpoints: false });
		expect(rangesOn([consultations], "2026-10-14", "checkpoints")).toEqual([]);
		expect(rangesOn([consultations], "2026-10-14", "consultations")).toEqual([
			hours(9, 13),
		]);
	});
});

describe("takesCheckpoints", () => {
	it("needs hours confirmed within the stale limit", () => {
		expect(takesCheckpoints(availability(), now)).toBe(true);
		expect(takesCheckpoints(availability({ confirmedAt: null }), now)).toBe(
			false,
		);
		expect(
			takesCheckpoints(
				availability({ confirmedAt: new Date("2026-08-01T00:00:00Z") }),
				now,
			),
		).toBe(false);
	});

	it("is closed to new checkpoints for consultations only", () => {
		expect(
			takesCheckpoints(
				availability({ status: AdvisorAvailabilityStatus.ConsultationsOnly }),
				now,
			),
		).toBe(false);
	});
});

describe("freeFirstCalls", () => {
	it("offers each hour a 45-minute call fits, in the advisor's zone", () => {
		// Lisbon is UTC+1 in October: 09:00 there is 08:00 UTC.
		expect(
			iso(freeFirstCalls(availability(), [], "2026-10-21", "2026-10-21", now)),
		).toEqual([
			"2026-10-21T08:00:00.000Z",
			"2026-10-21T09:00:00.000Z",
			"2026-10-21T10:00:00.000Z",
			"2026-10-21T11:00:00.000Z",
		]);
	});

	it("keeps the local hour across a clock change", () => {
		// Lisbon leaves summer time on 25 Oct 2026; the 4th and 5th calls are in
		// winter time, the same 09:00 there, an hour later in UTC.
		const calls = freeFirstCalls(
			availability(),
			[],
			"2026-10-21",
			"2026-10-21",
			now,
		);
		expect(calls[0].toISOString()).toBe("2026-10-21T08:00:00.000Z");
		const busyInWinter = [
			{
				start: new Date("2026-11-11T09:00:00Z"),
				end: new Date("2026-11-11T09:45:00Z"),
			},
		];
		// The 4th call of the 09:00 series is 11 Nov 09:00 Lisbon = 09:00 UTC.
		expect(
			iso(
				freeFirstCalls(availability(), busyInWinter, "2026-10-21", "2026-10-21", now),
			),
		).not.toContain("2026-10-21T08:00:00.000Z");
	});

	it("drops a first call any of whose five calls is taken", () => {
		const busy = [
			{
				// The 3rd call of the 10:00 series: Wed 4 Nov 10:00 Lisbon.
				start: new Date("2026-11-04T10:30:00Z"),
				end: new Date("2026-11-04T11:15:00Z"),
			},
		];
		expect(
			iso(freeFirstCalls(availability(), busy, "2026-10-21", "2026-10-21", now)),
		).toEqual(["2026-10-21T08:00:00.000Z", "2026-10-21T11:00:00.000Z"]);
	});

	it("drops a series that runs into months with other hours", () => {
		const rules = [
			rule(),
			rule({
				monthFrom: "2026-11-01",
				monthTo: "2026-11-30",
				ranges: [hours(9, 10)],
			}),
		];
		// Only 09:00 survives November on every one of the five Wednesdays.
		expect(
			iso(
				freeFirstCalls(availability({ rules }), [], "2026-10-21", "2026-10-21", now),
			),
		).toEqual(["2026-10-21T08:00:00.000Z"]);
	});

	it("offers nothing sooner than the minimum days ahead", () => {
		// Wednesday 14 Oct is two days off.
		expect(
			freeFirstCalls(availability(), [], "2026-10-14", "2026-10-14", now),
		).toEqual([]);
	});

	it("offers nothing while the advisor is away", () => {
		expect(
			freeFirstCalls(
				availability({
					status: AdvisorAvailabilityStatus.Away,
					awayUntil: new Date("2026-11-01T00:00:00Z"),
				}),
				[],
				"2026-10-21",
				"2026-10-21",
				now,
			),
		).toEqual([]);
	});
});

describe("earliestFirstCall", () => {
	it("finds the first free series however far ahead", () => {
		const rules = [
			rule({
				monthFrom: "2027-03-01",
				monthTo: "2027-05-31",
				weekdays: [1],
				ranges: [hours(9, 10)],
			}),
		];
		// The first Monday of March 2027 is the 1st; Lisbon is UTC+0 then.
		expect(earliestFirstCall(availability({ rules }), [], now)?.toISOString()).toBe(
			"2027-03-01T09:00:00.000Z",
		);
	});

	it("is null for an advisor with no series to offer", () => {
		expect(earliestFirstCall(availability({ rules: [] }), [], now)).toBeNull();
	});
});

describe("callsOutside", () => {
	it("names the booked calls new hours would leave out", () => {
		const calls = [
			{ id: "in", scheduledAt: new Date("2026-10-21T08:00:00Z") },
			{ id: "out", scheduledAt: new Date("2026-10-21T12:30:00Z") },
		];
		expect(
			callsOutside([rule()], "Europe/Lisbon", calls).map((call) => call.id),
		).toEqual(["out"]);
	});
});
