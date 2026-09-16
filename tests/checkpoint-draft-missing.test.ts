import { describe, expect, it } from "vitest";
import {
	CheckpointCuratorKind,
	CheckpointItemKind,
} from "@/config/prisma-enums";
import { draftMissing } from "@/lib/checkpoint-draft";
import type { CheckpointDto, CheckpointItemDto } from "@/types/checkpoints";

const outcome = {
	id: "o1",
	kind: CheckpointItemKind.Outcome,
	order: 1,
	text: "A playable slice",
	originalText: null,
	cut: false,
	addedAt: null,
	note: null,
	acceptedNote: null,
	artifact: null,
} satisfies CheckpointItemDto;

const draft = (
	patch: Partial<
		Pick<
			CheckpointDto,
			"goal" | "curatorKind" | "curator" | "startedAt" | "items"
		>
	> = {},
) => ({
	goal: "Ship a slice",
	curatorKind: CheckpointCuratorKind.AI,
	curator: null,
	startedAt: "2026-09-01T00:00:00.000Z",
	items: [outcome as CheckpointItemDto],
	...patch,
});

describe("draftMissing", () => {
	it("asks for nothing once the three answers are in", () => {
		expect(draftMissing(draft())).toEqual([]);
	});

	it("lists them in the order the purchase asks for them", () => {
		expect(
			draftMissing(
				draft({
					goal: "",
					curatorKind: CheckpointCuratorKind.Human,
					startedAt: null,
				}),
			),
		).toEqual(["goal", "curator", "startDate"]);
	});

	it("counts a goal with no outcomes as unwritten", () => {
		expect(draftMissing(draft({ items: [] }))).toEqual(["goal"]);
	});

	it("counts a chosen human curator as answered", () => {
		expect(
			draftMissing(
				draft({
					curatorKind: CheckpointCuratorKind.Human,
					curator: { id: "u1", name: "Marta", image: null },
				}),
			),
		).toEqual([]);
	});

	// The default is AI, so "chose the AI curator" and "has not chosen" are the
	// same row until the schema can tell them apart.
	it("never reports an AI curator as missing", () => {
		expect(draftMissing(draft({ curatorKind: CheckpointCuratorKind.AI }))).toEqual(
			[],
		);
	});
});
