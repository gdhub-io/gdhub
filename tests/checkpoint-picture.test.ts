import { describe, expect, it } from "vitest";
import type { Direction } from "@/config/checkpoint";
import {
	type CheckpointPicture,
	duePicturePoints,
	isIdle,
	pictureDifference,
	renderDifference,
	settleDirection,
} from "@/lib/checkpoints/picture";

const picture = (patch: Partial<CheckpointPicture> = {}): CheckpointPicture => ({
	version: 1,
	at: "2026-11-09",
	point: 1,
	project: {
		stage: "Prototyping",
		description: "Co-op roguelite about lighthouse keepers",
		genre: "Roguelite",
		platform: "PC",
		setting: "Sea",
		visualStyle: "Low-poly",
		links: { itch: "https://lumen.itch.io/tide" },
	},
	team: {
		members: [
			{
				id: "tm_1",
				name: "Ana",
				role: "Programmer",
				level: "Middle",
				hours: { from: 10, to: 15 },
			},
			{
				id: "tm_2",
				name: "Bo",
				role: "3D artist",
				level: "Junior",
				hours: { from: 10, to: 15 },
			},
		],
		invitations: [],
		vacancies: [],
	},
	work: {
		artifacts: [{ id: "art_1", type: "Image", name: "Mood board" }],
		devlogs: [{ id: "rep_1", number: 1 }],
	},
	signals: { projectViews: 300, devlogViews: 180, applause: 20 },
	plan: {
		inputs: [],
		tasks: [
			{ id: "it_1", text: "Playable core loop", cut: false, proved: false },
			{ id: "it_2", text: "Style board", cut: false, proved: false },
		],
	},
	...patch,
});

describe("pictureDifference", () => {
	it("lists nothing but the open tasks between two equal pictures", () => {
		const difference = pictureDifference(picture(), picture());

		expect(difference.development).toEqual([]);
		expect(difference.team).toEqual([]);
		expect(difference.marketing).toEqual([]);
		expect(difference.management).toEqual([
			'still open: "Playable core loop", "Style board"',
		]);
	});

	it("names a member's hours from → to, not as one leaving and another joining", () => {
		const before = picture();
		const after = picture({
			team: {
				...before.team,
				members: before.team.members.map((member) =>
					member.id === "tm_2"
						? { ...member, hours: { from: 5, to: 10 } }
						: member,
				),
			},
		});

		expect(pictureDifference(before, after).team).toEqual([
			"Bo: hours 10–15 → 5–10 h/week",
		]);
	});

	it("tells joined, left, invited and a vacancy apart", () => {
		const before = picture();
		const after = picture({
			team: {
				members: [
					before.team.members[0],
					{ id: "tm_3", name: "Cy", role: "Sound designer", level: null, hours: null },
				],
				invitations: [{ id: "inv_1", role: "Level designer", status: "Pending" }],
				vacancies: [
					{ id: "vac_1", title: "Level designer", status: "Published", applicants: 2 },
				],
			},
		});

		expect(pictureDifference(before, after).team).toEqual([
			"Cy joined as Sound designer, hours not stated",
			"Bo (3D artist) left",
			"invited a Level designer (Pending)",
			'vacancy "Level designer" Published, 2 applied',
		]);
	});

	it("gives the period's signals as the difference of the totals", () => {
		const after = picture({
			signals: { projectViews: 388, devlogViews: 234, applause: 29 },
		});

		expect(pictureDifference(picture(), after).marketing).toEqual([
			"project views +88",
			"devlog views +54",
			"applause +9",
		]);
	});

	it("names a link added and a description rewritten", () => {
		const before = picture();
		const after = picture({
			project: {
				...before.project,
				description: "Co-op roguelite, now with a storm system",
				links: { ...before.project.links, steam: "https://store.steampowered.com/app/1" },
			},
		});
		const difference = pictureDifference(before, after);

		expect(difference.marketing).toEqual([
			"steam link added: https://store.steampowered.com/app/1",
		]);
		expect(difference.management[0]).toBe("description rewritten");
	});

	it("names new work and a task proved", () => {
		const before = picture();
		const after = picture({
			work: {
				artifacts: [
					...before.work.artifacts,
					{ id: "art_2", type: "ExecutableBuild", name: "Prototype v0.2" },
				],
				devlogs: [...before.work.devlogs, { id: "rep_2", number: 2 }],
			},
			plan: {
				inputs: [],
				tasks: [
					{ id: "it_1", text: "Playable core loop", cut: false, proved: true },
					{ id: "it_2", text: "Style board", cut: true, proved: false },
				],
			},
		});
		const difference = pictureDifference(before, after);

		expect(difference.development).toEqual([
			'+ artifact "Prototype v0.2" (ExecutableBuild)',
			"+ devlog #2",
		]);
		expect(difference.management).toEqual([
			'task proved: "Playable core loop"',
			'task cut: "Style board"',
		]);
	});
});

describe("isIdle", () => {
	it("is idle when only views and applause moved", () => {
		const after = picture({
			signals: { projectViews: 500, devlogViews: 300, applause: 40 },
		});

		expect(isIdle(picture(), after)).toBe(true);
	});

	it("is not idle once anything was added or changed", () => {
		const before = picture();

		expect(
			isIdle(
				before,
				picture({ work: { ...before.work, devlogs: [...before.work.devlogs, { id: "rep_2", number: 2 }] } }),
			),
		).toBe(false);
		expect(
			isIdle(
				before,
				picture({ project: { ...before.project, links: {} } }),
			),
		).toBe(false);
	});
});

describe("renderDifference", () => {
	it("says so when nothing changed", () => {
		expect(
			renderDifference(
				{ development: [], team: [], marketing: [], management: [] },
				"day 8",
			),
		).toBe("Nothing changed on the project since day 8.");
	});

	it("writes one block per lens with a change", () => {
		expect(
			renderDifference(
				{
					development: ["+ devlog #2"],
					team: [],
					marketing: ["applause +9"],
					management: [],
				},
				"day 8",
			),
		).toBe(
			"What changed on the project since day 8:\nDevelopment:\n- + devlog #2\nMarketing:\n- applause +9",
		);
	});
});

describe("duePicturePoints", () => {
	const startedAt = new Date("2026-11-02T00:00:00Z");

	it("is nothing before day 1", () => {
		expect(duePicturePoints(startedAt, new Date("2026-11-01T23:59:00Z"))).toEqual([]);
	});

	it("is day 1's picture alone through the first sprint", () => {
		expect(duePicturePoints(startedAt, new Date("2026-11-02T01:00:00Z"))).toEqual([0]);
		expect(duePicturePoints(startedAt, new Date("2026-11-08T23:00:00Z"))).toEqual([0]);
	});

	it("adds sprint 1 the night after its day 7, and all four after day 28", () => {
		expect(duePicturePoints(startedAt, new Date("2026-11-09T01:00:00Z"))).toEqual([0, 1]);
		expect(duePicturePoints(startedAt, new Date("2026-11-30T01:00:00Z"))).toEqual([0, 1, 2, 3, 4]);
	});
});

describe("settleDirection", () => {
	const read = (goal: Direction, stage: Direction) => ({
		goal: { value: goal, why: "g" },
		stage: { value: stage, why: "s" },
	});

	it("makes an empty sprint idle on both goals whatever the model said", () => {
		const settled = settleDirection(read("toward", "sideways"), true);
		expect([settled.goal.value, settled.stage.value]).toEqual(["idle", "idle"]);
	});

	it("never lets the model call a sprint with changes idle", () => {
		const settled = settleDirection(read("idle", "toward"), false);
		expect([settled.goal.value, settled.stage.value]).toEqual(["stalled", "toward"]);
	});
});

describe("the lab's E2E Test Game road", async () => {
	const { E2E_ROAD, e2eCheckpoint } = await import(
		"@/services/checkpoints/ai-curator-lab/situations/e2e-test-game"
	);

	// The road says which sprints did nothing; the pictures must agree, or the lab checks the curator against a lie.
	it.each(E2E_ROAD.map((checkpoint) => [checkpoint.number, checkpoint] as const))(
		"checkpoint %i is idle exactly where its road says",
		(number, checkpoint) => {
			const cp = e2eCheckpoint(number);
			expect([1, 2, 3, 4].map((sprint) => isIdle(cp.picture(sprint - 1), cp.picture(sprint)))).toEqual(
				checkpoint.sprints.map((sprint) => sprint.direction === "idle"),
			);
		},
	);

	it("shows Bo's hours dropping in checkpoint 3, sprint 2", () => {
		const cp = e2eCheckpoint(3);
		expect(pictureDifference(cp.picture(1), cp.picture(2)).team).toContain(
			"Bo Lindqvist: hours 10–15 → 5–10 h/week",
		);
	});

	it("covers every direction and every verdict, and ends released", () => {
		const directions = new Set(E2E_ROAD.flatMap((checkpoint) => checkpoint.sprints.map((sprint) => sprint.direction)));
		expect([...directions].sort()).toEqual(["idle", "sideways", "stalled", "toward"]);
		expect(new Set(E2E_ROAD.map((checkpoint) => checkpoint.verdict))).toEqual(
			new Set(["StageClosed", "GoalMet", "GoalMissed"]),
		);
		expect(E2E_ROAD.at(-1)).toMatchObject({ stage: "Preparing a release version", verdict: "StageClosed" });
	});

	// A checkpoint that closes its stage hands on to the next stage; any other verdict keeps it.
	it("moves to the next stage only after a closed one", () => {
		for (const [before, after] of E2E_ROAD.slice(0, -1).map((checkpoint, index) => [checkpoint, E2E_ROAD[index + 1]] as const))
			expect(after.stage).toBe(before.verdict === "StageClosed" ? before.nextStage : before.stage);
	});

	it("keeps every sprint inside its own dates", () => {
		for (const checkpoint of E2E_ROAD) {
			const cp = e2eCheckpoint(checkpoint.number);
			checkpoint.sprints.forEach((sprint, index) => {
				const from = cp.day(7 * index + 1);
				const to = cp.day(7 * index + 7);
				for (const dated of [...sprint.devlogs, ...sprint.artifacts, ...(sprint.team ?? [])])
					expect([from <= dated.on, dated.on <= to], `${checkpoint.number}/${index + 1} ${dated.on}`).toEqual([true, true]);
			});
		}
	});

	// The verdict rule misses a goal on any unproven task, so a road that means a met goal proves every one.
	it("proves every task of a checkpoint whose goal the road does not miss", () => {
		for (const checkpoint of E2E_ROAD.filter((each) => each.verdict !== "GoalMissed")) {
			const unproven = e2eCheckpoint(checkpoint.number)
				.tasks(4)
				.filter((task) => !task.evidence.some((piece) => piece.seen?.match === "Matches"));
			expect(unproven.map((task) => task.text), `checkpoint ${checkpoint.number}`).toEqual([]);
		}
	});

	it("tells the team on the day it changes: Dan hired, Cleo gone", () => {
		const names = (number: number, moment: "start" | "end") =>
			e2eCheckpoint(number).facts(moment).team.people.map((person) => person.name);
		expect(names(4, "start")).toContain("Cleo Martin");
		expect(names(4, "end")).toEqual(["Ana Sousa", "Bo Lindqvist", "Dan Okafor"]);
		expect(e2eCheckpoint(4).facts("end").team.people.find((person) => person.name === "Dan Okafor")?.joinedOn).toBe("2026-12-09");
	});
});

describe("directionOf", async () => {
	const { directionOf } = await import("@/lib/checkpoints/picture");
	const read = { value: "toward" as const, why: "w" };

	it("counts an AI review's direction, kept under its notes", () => {
		expect(directionOf({ notes: { direction: { goal: read, stage: read } } })).toBeTruthy();
	});

	it("counts a human call's direction only once the curator confirmed it", () => {
		expect(directionOf({ direction: { goal: read, stage: read, confirmedAt: null } })).toBeUndefined();
		expect(
			directionOf({ direction: { goal: read, stage: read, confirmedAt: "2026-11-09T12:00:00Z" } }),
		).toBeTruthy();
	});
});

describe("directionOpen", async () => {
	const { directionOpen } = await import("@/lib/checkpoints/call");
	const sessions = [{ index: 5, scheduledAt: "2026-11-30T14:00:00Z" }];
	const before = new Date("2026-11-30T13:59:00Z");
	const after = new Date("2026-11-30T14:00:00Z");

	it("never opens on call 1", () => {
		expect(directionOpen(sessions, 1, before)).toBe(false);
	});

	it("closes calls 2–4 when the final call starts, and keeps the final one open", () => {
		expect(directionOpen(sessions, 3, before)).toBe(true);
		expect(directionOpen(sessions, 3, after)).toBe(false);
		expect(directionOpen(sessions, 5, after)).toBe(true);
	});
});
