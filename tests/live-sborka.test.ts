import { describe, expect, it } from "vitest";
import {
	BROADCAST,
	gridRows,
	peopleInOrder,
	RAIL_PALETTE,
	sborkaAssets,
	screenKey,
	showsSpeakerFrame,
	sourcesOnAir,
	streamUpdateLayout,
	tileFrames,
} from "@/lib/live/sborka";

describe("gridRows", () => {
	it.each([
		[0, []],
		[1, [1]],
		[2, [2]],
		[3, [2, 1]],
		[4, [2, 2]],
		[5, [3, 2]],
		[7, [3, 3, 1]],
		[10, [4, 4, 2]],
		[15, [4, 4, 4, 3]],
	])("%i people → %j", (count, rows) => {
		expect(gridRows(count)).toEqual(rows);
	});
});

describe("peopleInOrder", () => {
	it("keeps the host's order, drops who left, appends newcomers by join order", () => {
		expect(peopleInOrder(["b", "gone", "a"], ["a", "b", "c", "d"])).toEqual([
			"b",
			"a",
			"c",
			"d",
		]);
	});
});

describe("sourcesOnAir", () => {
	const direction = {
		order: ["leo", "pavel", "olga"],
		onScreen: ["pavel", "olga", screenKey("leo"), screenKey("olga")],
		title: "",
	};

	it("puts a shared screen right after its owner and skips what is off screen", () => {
		expect(
			sourcesOnAir(direction, ["pavel", "olga", "leo"], ["leo"]),
		).toEqual([screenKey("leo"), "pavel", "olga"]);
	});

	it("drops a screen that is no longer being shared", () => {
		expect(sourcesOnAir(direction, ["pavel", "olga", "leo"], [])).toEqual([
			"pavel",
			"olga",
		]);
	});

	it("drops whoever left the room", () => {
		expect(sourcesOnAir(direction, ["olga"], [])).toEqual(["olga"]);
	});
});

describe("showsSpeakerFrame", () => {
	it("frames the speaker only from three cameras on air", () => {
		expect([1, 2, 3, 5].map(showsSpeakerFrame)).toEqual([
			false,
			false,
			true,
			true,
		]);
	});
});

describe("streamUpdateLayout", () => {
	it("repeats the participant filter, deduplicating a sharer's two sources", () => {
		const layout = streamUpdateLayout({
			sources: ["leo", screenKey("leo"), "olga"],
			people: {},
			title: "Как ИИ меняет разработку игр",
		});
		expect(layout.participants).toEqual({
			video: ["leo", "olga"],
			audio: ["*"],
		});
		expect(layout.composition_params?.["sborka.sources"]).toBe(
			"leo,leo:screen,olga",
		);
		expect(layout.composition_params?.["sborka.title"]).toBe(
			"Как ИИ меняет разработку игр",
		);
	});
});

describe("sborkaAssets", () => {
	it("ships an icon in both states for every rail entry, and our grid", () => {
		const assets = sborkaAssets("https://gdhub.io");
		for (const slug of Object.keys(RAIL_PALETTE)) {
			expect(assets[`images/sborka-${slug}-on.png`]).toBe(
				`https://gdhub.io/vcs/sborka/icons/${slug}-on.png`,
			);
			expect(assets[`images/sborka-${slug}-off.png`]).toBeDefined();
		}
		expect(assets["components/VideoGrid.js"]).toBe(
			"https://gdhub.io/vcs/sborka/VideoGrid.js",
		);
	});
});

describe("tileFrames", () => {
	it("gives every tile the same size and centres an incomplete last row", () => {
		const { cameras } = tileFrames(5, false);
		expect(new Set(cameras.map((f) => `${f.w}x${f.h}`)).size).toBe(1);
		const [a, b] = cameras.slice(3);
		const left = a.x - BROADCAST.stage.x;
		const right = BROADCAST.stage.x + BROADCAST.stage.w - (b.x + b.w);
		expect(left).toBeCloseTo(right);
	});

	it("keeps the grid inside the stage", () => {
		for (const count of [1, 2, 3, 4, 7, 15]) {
			for (const f of tileFrames(count, false).cameras) {
				expect(f.x + f.w).toBeLessThanOrEqual(1900 + 1e-6);
				expect(f.y + f.h).toBeLessThanOrEqual(1060 + 1e-6);
			}
		}
	});

	it("gives a shared screen the stage and stacks cameras beside it", () => {
		const { share, cameras } = tileFrames(4, true);
		expect(share).toEqual({ x: 100, y: 104, w: 1480, h: 956 });
		expect(cameras.map((f) => [f.x, f.y, f.w, f.h])).toEqual([
			[1600, 104, 300, 224],
			[1600, 348, 300, 224],
			[1600, 592, 300, 224],
			[1600, 836, 300, 224],
		]);
	});
});
