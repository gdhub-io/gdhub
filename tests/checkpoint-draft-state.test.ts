import { describe, expect, it } from "vitest";
import { CheckpointStatus } from "@/config/prisma-enums";
import { isDeclined, isFreshDraft } from "@/lib/checkpoints/draft";

const draft = {
	status: CheckpointStatus.Draft,
	paymentId: null,
	curatorDeclinedAt: null,
	curator: null,
};
const handedBack = { ...draft, curatorDeclinedAt: "2026-10-01T00:00:00.000Z" };

describe("draft states", () => {
	it("tells a fresh draft from one paid for or handed back", () => {
		expect(isFreshDraft(draft)).toBe(true);
		expect(isFreshDraft({ ...draft, paymentId: "pay1" })).toBe(false);
		expect(isFreshDraft(handedBack)).toBe(false);
		expect(
			isFreshDraft({ ...draft, status: CheckpointStatus.AwaitingCurator }),
		).toBe(false);
	});

	it("reads a decline only while nobody has been named since", () => {
		expect(isDeclined(handedBack)).toBe(true);
		expect(isDeclined(draft)).toBe(false);
		expect(
			isDeclined({ ...handedBack, curator: { id: "c2" } as never }),
		).toBe(false);
		expect(
			isDeclined({ ...handedBack, status: CheckpointStatus.AwaitingCurator }),
		).toBe(false);
	});
});
