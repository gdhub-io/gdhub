import { describe, expect, it } from "vitest";
import {
	ArtifactCheckStatus,
	CheckpointItemKind,
	CheckpointVerdict,
	EvidenceMatch,
} from "@/config/prisma-enums";
import {
	isProven,
	settleVerdict,
	standingOf,
	type VerdictItem,
	weighOutcomes,
} from "@/lib/checkpoints/verdict";

const outcome = (id: string, over: Partial<VerdictItem> = {}): VerdictItem => ({
	id,
	kind: CheckpointItemKind.Outcome,
	text: `outcome ${id}`,
	cut: false,
	evidence: [],
	...over,
});

const readable = { checkStatus: ArtifactCheckStatus.Readable };
const piece = (match: EvidenceMatch, note: string | null = null) => ({
	artifact: readable,
	match,
	matchNote: note,
});
const seen = (match: EvidenceMatch, note: string | null = null) => ({
	evidence: [piece(match, note)],
});
const on = (artifact: VerdictItem["evidence"][number]["artifact"]) => ({
	evidence: [{ artifact }],
});

describe("weighOutcomes — the AI curator, a cautious optimist (GDHUB-81)", () => {
	it("ignores inputs — only the outcomes are owed evidence", () => {
		expect(
			weighOutcomes([
				{
					id: "i1",
					kind: CheckpointItemKind.Input,
					text: "a concept document",
					cut: false,
					evidence: [],
				},
				outcome("o1", seen(EvidenceMatch.Matches)),
			]),
		).toEqual({ unproven: [], trusted: [], partly: [] });
	});

	it("does not count a cut line as missing evidence", () => {
		expect(weighOutcomes([outcome("o1", { cut: true })]).unproven).toEqual([]);
	});

	it("owes evidence for a line added on day 14 like any other", () => {
		expect(
			weighOutcomes([outcome("o1", { addedAt: new Date() } as never)]).unproven,
		).toMatchObject([{ id: "o1", reason: "missing" }]);
	});

	it("does not deliver evidence that shows something else, however well it opens", () => {
		expect(
			weighOutcomes([outcome("o1", seen(EvidenceMatch.DoesNotMatch))]).unproven,
		).toEqual([{ id: "o1", text: "outcome o1", reason: "doesNotMatch" }]);
	});

	it("does not deliver a link that leads nowhere", () => {
		for (const checkNote of ["notFound", "unreachable", "timeout", null]) {
			expect(
				weighOutcomes([
					outcome("o1", on({ checkStatus: ArtifactCheckStatus.Unreachable, checkNote })),
				]).unproven,
			).toMatchObject([{ id: "o1", reason: "broken" }]);
		}
	});

	it("takes on trust what the AI could not see into", () => {
		const weighed = weighOutcomes([
			outcome("login", on({
					checkStatus: ArtifactCheckStatus.Unreachable,
					checkNote: "needsLogin",
				})),
			outcome("format", on({ checkStatus: ArtifactCheckStatus.Unsupported })),
			outcome("unclear", seen(EvidenceMatch.CannotTell)),
			outcome("unjudged", on(readable)),
			outcome("waiting", on({ checkStatus: null })),
		]);

		expect(weighed.unproven).toEqual([]);
		expect(weighed.trusted.map(({ id, reason }) => [id, reason])).toEqual([
			["login", "needsLogin"],
			["format", "unreadable"],
			["unclear", "unreadable"],
			["unjudged", "unreadable"],
			["waiting", "notChecked"],
		]);
	});

	it("counts evidence shown in part, with what was seen", () => {
		expect(
			weighOutcomes([outcome("o1", seen(EvidenceMatch.Partly, "one island only"))]),
		).toEqual({
			unproven: [],
			trusted: [],
			partly: [{ id: "o1", text: "outcome o1", note: "one island only" }],
		});
	});

	it("counts an outcome a human curator accepted with no artifact", () => {
		expect(
			weighOutcomes([outcome("o1", { acceptedNote: "Shown running on the call." })]),
		).toEqual({ unproven: [], trusted: [], partly: [] });
	});

	it("does not accept a blank acceptedNote as a reason", () => {
		expect(
			weighOutcomes([outcome("o1", { acceptedNote: "   " })]).unproven,
		).toMatchObject([{ id: "o1", reason: "missing" }]);
	});
});

describe("standingOf — the best of a task's artifacts (GDHUB-115)", () => {
	it("delivers a task when one artifact shows it, beside one that does not open", () => {
		expect(
			standingOf(
				outcome("o1", {
					evidence: [
						{ artifact: { checkStatus: ArtifactCheckStatus.Unreachable } },
						piece(EvidenceMatch.Matches),
					],
				}),
			),
		).toEqual({ is: "delivered" });
	});

	it("prefers shown in part over taken on trust", () => {
		expect(
			standingOf(
				outcome("o1", {
					evidence: [
						{ artifact: { checkStatus: ArtifactCheckStatus.Unsupported } },
						piece(EvidenceMatch.Partly, "one island"),
					],
				}),
			),
		).toEqual({ is: "partly", note: "one island" });
	});

	it("of two that fail, says the one that shows something else", () => {
		expect(
			standingOf(
				outcome("o1", {
					evidence: [
						{ artifact: { checkStatus: ArtifactCheckStatus.Unreachable } },
						piece(EvidenceMatch.DoesNotMatch),
					],
				}),
			),
		).toEqual({ is: "unproven", reason: "doesNotMatch" });
	});
});

describe("isProven — the human curator's plain rule", () => {
	it("counts a readable artifact whatever the AI made of it", () => {
		expect(isProven(outcome("o1", seen(EvidenceMatch.DoesNotMatch)))).toBe(true);
	});

	it("does not count an artifact behind a login", () => {
		expect(
			isProven(
				outcome("o1", on({
						checkStatus: ArtifactCheckStatus.Unreachable,
						checkNote: "needsLogin",
					})),
			),
		).toBe(false);
	});
});

describe("settleVerdict", () => {
	it("refuses StageClosed while an outcome is not delivered", () => {
		const settled = settleVerdict(
			[outcome("o1", seen(EvidenceMatch.Matches)), outcome("o2")],
			CheckpointVerdict.StageClosed,
		);

		expect(settled.verdict).toBe(CheckpointVerdict.GoalMissed);
		expect(settled.overrode).toBe(CheckpointVerdict.StageClosed);
		expect(settled.unproven).toMatchObject([{ id: "o2" }]);
	});

	it("misses the goal on evidence of something else", () => {
		expect(
			settleVerdict(
				[outcome("o1", seen(EvidenceMatch.DoesNotMatch))],
				CheckpointVerdict.GoalMet,
			).verdict,
		).toBe(CheckpointVerdict.GoalMissed);
	});

	it("does not report an override when the curator already said GoalMissed", () => {
		const settled = settleVerdict([outcome("o1")], CheckpointVerdict.GoalMissed);

		expect(settled.verdict).toBe(CheckpointVerdict.GoalMissed);
		expect(settled.overrode).toBeNull();
	});

	it("keeps GoalMissed when every task is delivered: the plan done is not the goal shown", () => {
		const settled = settleVerdict(
			[
				outcome("o1", seen(EvidenceMatch.CannotTell)),
				outcome("o2", seen(EvidenceMatch.Partly)),
				outcome("o3", { cut: true }),
			],
			CheckpointVerdict.GoalMissed,
		);

		expect(settled.verdict).toBe(CheckpointVerdict.GoalMissed);
		expect(settled.overrode).toBeNull();
		expect(settled.trusted).toMatchObject([{ id: "o1" }]);
		expect(settled.partly).toMatchObject([{ id: "o2" }]);
	});

	it("leaves StageClosed alone once everything is delivered", () => {
		expect(
			settleVerdict(
				[outcome("o1", seen(EvidenceMatch.Matches))],
				CheckpointVerdict.StageClosed,
			),
		).toEqual({
			verdict: CheckpointVerdict.StageClosed,
			overrode: null,
			unproven: [],
			trusted: [],
			partly: [],
		});
	});

	it("never promotes GoalMet to StageClosed — the stage is a judgement", () => {
		expect(
			settleVerdict(
				[outcome("o1", seen(EvidenceMatch.Matches))],
				CheckpointVerdict.GoalMet,
			).verdict,
		).toBe(CheckpointVerdict.GoalMet);
	});
});
