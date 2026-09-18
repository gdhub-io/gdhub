import { describe, expect, it } from "vitest";
import { CheckpointCuratorKind, CheckpointStatus } from "@/config/prisma-enums";
import { sprintFactsOf, sprintNeedsYou } from "@/lib/checkpoint-facts";
import type {
	CheckpointDto,
	CheckpointPulseRowDto,
	CheckpointSprintDto,
} from "@/types/checkpoints";

const sprint = (
	number: number,
	state: CheckpointSprintDto["state"],
): CheckpointSprintDto => ({
	number,
	from: `2026-09-${String((number - 1) * 7 + 1).padStart(2, "0")}T00:00:00.000Z`,
	to: `2026-09-${String(number * 7).padStart(2, "0")}T00:00:00.000Z`,
	firstDay: (number - 1) * 7 + 1,
	lastDay: number * 7,
	devlogDay: number * 7 - 1,
	state,
});

const member = (
	name: string,
	states: CheckpointPulseRowDto["cells"][number]["state"][],
): CheckpointPulseRowDto => ({
	memberId: name,
	userId: `u-${name}`,
	name,
	image: null,
	role: "Artist",
	joinedAt: null,
	leftAt: null,
	cells: states.map((state, index) => ({
		sprint: index + 1,
		state,
		confirmedAt: state === "confirmed" ? "2026-09-10T00:00:00.000Z" : null,
		source: null,
	})),
});

const checkpoint = (over: Partial<CheckpointDto> = {}): CheckpointDto => ({
	id: "cp",
	projectId: "p",
	stepId: "s",
	stageName: "Prototyping",
	order: 2,
	status: CheckpointStatus.Active,
	curatorDeclinedAt: null,
	paymentId: null,
	goal: "A playable slice",
	curatorKind: CheckpointCuratorKind.AI,
	curator: null,
	startedAt: "2026-09-01T09:00:00.000Z",
	dueAt: "2026-09-28T09:00:00.000Z",
	goalAgreedAt: null,
	revisedAt: null,
	revisedNote: null,
	midNote: null,
	summary: null,
	verdict: null,
	verdictNote: null,
	decidedAt: null,
	acceptedTermsAt: null,
	createdAt: "2026-09-01T08:00:00.000Z",
	updatedAt: "2026-09-14T08:00:00.000Z",
	items: [],
	day: 14,
	daysLeft: 14,
	sprints: [sprint(1, "done"), sprint(2, "current")],
	...over,
});

describe("sprintFactsOf", () => {
	it("takes only the devlog that landed in this sprint", () => {
		const data = checkpoint({
			reports: [
				{
					id: "r1",
					publishedAt: "2026-09-06T10:00:00.000Z",
					content: "one",
					curatorFeedback: null,
					curatorFeedbackAt: null,
					sprint: 1,
				},
				{
					id: "r2",
					publishedAt: "2026-09-13T10:00:00.000Z",
					content: "two",
					curatorFeedback: "Good",
					curatorFeedbackAt: "2026-09-14T08:00:00.000Z",
					sprint: 2,
				},
			],
		});

		expect(sprintFactsOf(data, sprint(1, "done")).devlog?.id).toBe("r1");
		expect(sprintFactsOf(data, sprint(2, "current")).review?.text).toBe("Good");
	});

	it("counts a mark only where someone was actually asked", () => {
		const data = checkpoint({
			pulses: [
				member("Priya", ["confirmed", "confirmed"]),
				member("Lena", ["confirmed", "waiting"]),
				member("Owen", ["notOnTeam", "notAsked"]),
			],
		});

		const facts = sprintFactsOf(data, sprint(2, "current"));

		expect(facts.marks).toEqual({
			confirmed: 1,
			asked: 2,
			missing: ["Lena"],
		});
	});

	it("shows the scope note on the sprint day 14 falls in, and only until it is answered", () => {
		const note = "Three of four outcomes have nothing claimed against them.";

		expect(sprintFactsOf(checkpoint({ midNote: note }), sprint(2, "current")).scopeNote).toBe(note);
		expect(sprintFactsOf(checkpoint({ midNote: note }), sprint(1, "done")).scopeNote).toBeNull();
		expect(
			sprintFactsOf(
				checkpoint({ midNote: note, revisedAt: "2026-09-14T12:00:00.000Z" }),
				sprint(2, "current"),
			).scopeNote,
		).toBeNull();
	});

	it("keeps evidence that proves nothing out of what the sprint proved", () => {
		const artifact = {
			id: "a1",
			name: "tide.zip",
			type: "Build" as never,
			link: "https://example.com/tide.zip",
			checkStatus: null,
		};
		const data = checkpoint({
			items: [
				{
					id: "i1",
					kind: "Outcome" as never,
					order: 1,
					text: "State one plays",
					originalText: null,
					cut: false,
					addedAt: null,
					note: null,
					acceptedNote: null,
					artifact,
				},
			],
			evidence: [
				{
					artifact,
					addedAt: "2026-09-13T10:00:00.000Z",
					addedBy: null,
					itemIds: ["i1"],
					sprint: 2,
				},
				{
					artifact: { ...artifact, id: "a2", name: "notes.md" },
					addedAt: "2026-09-13T11:00:00.000Z",
					addedBy: null,
					itemIds: [],
					sprint: 2,
				},
			],
		});

		const facts = sprintFactsOf(data, sprint(2, "current"));

		expect(facts.proved).toHaveLength(1);
		expect(facts.outcomesProved.map((item) => item.id)).toEqual(["i1"]);
	});
});

describe("sprintNeedsYou", () => {
	const facts = (over: Partial<ReturnType<typeof sprintFactsOf>>) =>
		({
			sprint: sprint(2, "current"),
			devlog: null,
			review: null,
			scopeNote: null,
			marks: { confirmed: 0, asked: 0, missing: [] },
			proved: [],
			outcomesProved: [],
			...over,
		}) as ReturnType<typeof sprintFactsOf>;

	it("marks a sprint whose devlog is due and missing", () => {
		expect(sprintNeedsYou(facts({}), 13)).toBe(true);
		expect(sprintNeedsYou(facts({}), 12)).toBe(false);
	});

	it("leaves a sprint alone once its devlog is in", () => {
		expect(
			sprintNeedsYou(
				facts({
					devlog: {
						id: "r",
						publishedAt: "2026-09-13T10:00:00.000Z",
						content: "",
						curatorFeedback: null,
						curatorFeedbackAt: null,
						sprint: 2,
					},
				}),
				14,
			),
		).toBe(false);
	});

	it("marks a sprint carrying an unanswered scope note whatever the day", () => {
		expect(sprintNeedsYou(facts({ scopeNote: "…" }), 8)).toBe(true);
	});

	it("says nothing about a sprint that has not started", () => {
		expect(sprintNeedsYou(facts({ sprint: sprint(4, "ahead") }), 14)).toBe(false);
	});
});
