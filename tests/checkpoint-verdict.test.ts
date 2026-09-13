import { describe, expect, it } from "vitest";
import {
	ArtifactCheckStatus,
	CheckpointItemKind,
	CheckpointVerdict,
} from "@/config/prisma-enums";
import {
	settleVerdict,
	unprovenOutcomes,
	type VerdictItem,
} from "@/lib/checkpoint-verdict";

const outcome = (id: string, over: Partial<VerdictItem> = {}): VerdictItem => ({
	id,
	kind: CheckpointItemKind.Outcome,
	text: `outcome ${id}`,
	cut: false,
	...over,
});

const readable = { checkStatus: ArtifactCheckStatus.Readable };

describe("unprovenOutcomes", () => {
	it("ignores inputs — only the outcomes are owed evidence", () => {
		expect(
			unprovenOutcomes([
				{
					id: "i1",
					kind: CheckpointItemKind.Input,
					text: "a concept document",
					cut: false,
				},
				outcome("o1", { artifact: readable }),
			]),
		).toEqual([]);
	});

	it("does not count a cut line as missing evidence", () => {
		expect(unprovenOutcomes([outcome("o1", { cut: true })])).toEqual([]);
	});

	it("owes evidence for a line added on day 14 like any other", () => {
		expect(
			unprovenOutcomes([outcome("o1", { addedAt: new Date() } as never)]),
		).toMatchObject([{ id: "o1", reason: "missing" }]);
	});

	it("tells an artifact nobody could open apart from none at all", () => {
		expect(
			unprovenOutcomes([
				outcome("none"),
				outcome("dead", {
					artifact: { checkStatus: ArtifactCheckStatus.Unreachable },
				}),
				outcome("odd", {
					artifact: { checkStatus: ArtifactCheckStatus.Unsupported },
				}),
				outcome("waiting", { artifact: { checkStatus: null } }),
			]),
		).toEqual([
			{ id: "none", text: "outcome none", reason: "missing" },
			{ id: "dead", text: "outcome dead", reason: "unreachable" },
			{ id: "odd", text: "outcome odd", reason: "unsupported" },
			{ id: "waiting", text: "outcome waiting", reason: "pending" },
		]);
	});

	it("counts an outcome a human curator accepted with no artifact", () => {
		expect(
			unprovenOutcomes([
				outcome("o1", { acceptedNote: "Shown running on the call." }),
			]),
		).toEqual([]);
	});

	it("does not accept a blank acceptedNote as a reason", () => {
		expect(
			unprovenOutcomes([outcome("o1", { acceptedNote: "   " })]),
		).toMatchObject([{ id: "o1", reason: "missing" }]);
	});

	it("lets one artifact prove two outcomes", () => {
		expect(
			unprovenOutcomes([
				outcome("o1", { artifact: readable }),
				outcome("o2", { artifact: readable }),
			]),
		).toEqual([]);
	});
});

describe("settleVerdict", () => {
	it("refuses StageClosed while an outcome is unproven", () => {
		const settled = settleVerdict(
			[outcome("o1", { artifact: readable }), outcome("o2")],
			CheckpointVerdict.StageClosed,
		);

		expect(settled.verdict).toBe(CheckpointVerdict.GoalMissed);
		expect(settled.overrode).toBe(CheckpointVerdict.StageClosed);
		expect(settled.unproven).toMatchObject([{ id: "o2" }]);
	});

	it("refuses GoalMet on the same evidence", () => {
		expect(
			settleVerdict([outcome("o1")], CheckpointVerdict.GoalMet).verdict,
		).toBe(CheckpointVerdict.GoalMissed);
	});

	it("does not report an override when the curator already said GoalMissed", () => {
		const settled = settleVerdict(
			[outcome("o1")],
			CheckpointVerdict.GoalMissed,
		);

		expect(settled.verdict).toBe(CheckpointVerdict.GoalMissed);
		expect(settled.overrode).toBeNull();
	});

	it("refuses GoalMissed when every remaining outcome is proven", () => {
		const settled = settleVerdict(
			[outcome("o1", { artifact: readable }), outcome("o2", { cut: true })],
			CheckpointVerdict.GoalMissed,
		);

		expect(settled.verdict).toBe(CheckpointVerdict.GoalMet);
		expect(settled.overrode).toBe(CheckpointVerdict.GoalMissed);
	});

	it("leaves StageClosed alone once everything is proven", () => {
		const settled = settleVerdict(
			[outcome("o1", { artifact: readable })],
			CheckpointVerdict.StageClosed,
		);

		expect(settled).toEqual({
			verdict: CheckpointVerdict.StageClosed,
			overrode: null,
			unproven: [],
		});
	});

	it("never promotes GoalMet to StageClosed — the stage is a judgement", () => {
		expect(
			settleVerdict([outcome("o1", { artifact: readable })], CheckpointVerdict.GoalMet)
				.verdict,
		).toBe(CheckpointVerdict.GoalMet);
	});
});
