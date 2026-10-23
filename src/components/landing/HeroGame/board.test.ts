import { describe, expect, it } from "vitest";
import {
	type ActorId,
	BOARD,
	cellKey,
	GUIDE,
	MOVE_RANGE,
	neighbours,
	reachable,
	START,
	TEAM,
	ZONE,
} from "./board";

const GUIDES = ["sage", "robot", "scout"] as const;

const occupiedExcept = (self: ActorId) =>
	new Set(
		(Object.keys(START) as ActorId[])
			.filter((id) => id !== self)
			.map((id) => cellKey(START[id])),
	);

describe("hero game board", () => {
	it("starts every actor on its own ground tile", () => {
		const ground = BOARD.tiles.filter((t) => t.kind === "ground").map(cellKey);
		const starts = Object.values(START).map(cellKey);
		expect(new Set(starts).size).toBe(starts.length);
		for (const key of starts) expect(ground).toContain(key);
	});

	it("puts the robot next to the sage", () => {
		expect(neighbours(START.sage).map(cellKey)).toContain(cellKey(START.robot));
	});

	it.each(TEAM)("lets the %s reach its own guide and no other", (id) => {
		for (const guide of GUIDES) {
			const beside = neighbours(START[guide]).some((c) =>
				ZONE[id].has(cellKey(c)),
			);
			expect(beside, `${id} → ${guide}`).toBe(guide === GUIDE[id]);
		}
	});

	it.each(TEAM)("lets the %s reach its guide in one move", (id) => {
		const reach = reachable(
			START[id],
			occupiedExcept(id),
			MOVE_RANGE,
			ZONE[id],
		);
		expect(
			neighbours(START[GUIDE[id]]).some((c) => reach.has(cellKey(c))),
		).toBe(true);
	});

	it("keeps every move inside the zone, off fog, trees, rocks and actors", () => {
		const blocked = occupiedExcept("author");
		const blockedTiles = new Set(
			BOARD.tiles.filter((t) => t.kind !== "ground").map(cellKey),
		);
		for (const from of ZONE.author) {
			const [x, z] = from.split(":").map(Number);
			if (blocked.has(from)) continue;
			for (const [key, { cost, path }] of reachable(
				{ x, z },
				blocked,
				MOVE_RANGE,
				ZONE.author,
			)) {
				expect(ZONE.author.has(key)).toBe(true);
				expect(blockedTiles.has(key)).toBe(false);
				expect(blocked.has(key)).toBe(false);
				expect(cost).toBeLessThanOrEqual(MOVE_RANGE);
				expect(path).toHaveLength(cost + 1);
			}
		}
	});

	it.each([
		["author", "programmer"],
		["author", "artist"],
		["programmer", "artist"],
	] as const)("lets the %s and the %s meet", (a, b) => {
		const meet = [...ZONE[a]].some((key) => {
			const [x, z] = key.split(":").map(Number);
			return neighbours({ x, z }).some((c) => ZONE[b].has(cellKey(c)));
		});
		expect(meet).toBe(true);
	});

	it("routes around a blocking actor", () => {
		const reach = reachable({ x: 2, z: 2 }, new Set(["3:2"]), 2);
		expect(reach.get("4:2")).toBeUndefined();
		expect(reach.get("3:3")?.path.map(cellKey)).toEqual(["2:2", "2:3", "3:3"]);
	});
});
