import { describe, expect, it } from "vitest";
import {
	type PurchaseCheckpoint,
	purchaseState,
} from "@/components/CheckpointPurchase/purchaseState";
import { CheckpointCuratorKind, CheckpointStatus } from "@/config/prisma-enums";

const draft: PurchaseCheckpoint = {
	status: CheckpointStatus.Draft,
	goal: "",
	curatorKind: CheckpointCuratorKind.AI,
	curator: null,
	startedAt: null,
	paymentId: null,
	curatorDeclinedAt: null,
	acceptedTermsAt: null,
};

const ready: PurchaseCheckpoint = {
	...draft,
	goal: "A playable greybox",
	startedAt: "2026-10-16T00:00:00.000Z",
	acceptedTermsAt: "2026-10-16T09:00:00.000Z",
};

const marta = { id: "u1", name: "Marta Ilves", image: null };

describe("purchaseState", () => {
	it("does not let the address skip a question the draft has not earned", () => {
		expect(purchaseState(draft, "payment").step).toBe("goal");
		expect(purchaseState({ ...draft, goal: "x" }, "payment").step).toBe(
			"curator",
		);
		expect(purchaseState(ready, "curator").step).toBe("curator");
		expect(purchaseState(ready, null).step).toBe("payment");
	});

	it("counts a person without a first call as not ready to pay", () => {
		const human = {
			...ready,
			curatorKind: CheckpointCuratorKind.Human,
			startedAt: null,
			curator: marta,
		};
		expect(purchaseState(human, "payment").step).toBe("curator");
	});

	it("keeps a bare ?step=ready on an untouched draft out of the paid screen", () => {
		const state = purchaseState({ ...draft, goal: "x" }, "ready");
		expect(state.paid).toBe(false);
		expect(state.isDraft).toBe(true);
	});

	it("shows the paid screen back from the checkout before the webhook lands", () => {
		expect(purchaseState(ready, "ready").paid).toBe(true);
	});

	it("shows an AI checkpoint that is already running as paid on ?step=ready, reload included", () => {
		const state = purchaseState(
			{ ...ready, status: CheckpointStatus.Active, paymentId: "pay_1" },
			"ready",
		);
		expect(state.paid).toBe(true);
		expect(state.running).toBe(false);
	});

	it("sends a running AI checkpoint opened without ?step=ready to the workflow", () => {
		const state = purchaseState(
			{ ...ready, status: CheckpointStatus.Active, paymentId: "pay_1" },
			null,
		);
		expect(state.paid).toBe(false);
		expect(state.running).toBe(true);
	});

	it("sends a person's checkpoint they already accepted to the workflow, even on ?step=ready", () => {
		const state = purchaseState(
			{
				...ready,
				status: CheckpointStatus.Active,
				curatorKind: CheckpointCuratorKind.Human,
				curator: marta,
				paymentId: "pay_1",
			},
			"ready",
		);
		expect(state.paid).toBe(false);
		expect(state.running).toBe(true);
	});

	it("shows a checkpoint awaiting its curator as paid from any step", () => {
		const state = purchaseState(
			{
				...ready,
				status: CheckpointStatus.AwaitingCurator,
				curatorKind: CheckpointCuratorKind.Human,
				curator: marta,
				paymentId: "pay_1",
			},
			"goal",
		);
		expect(state.paid).toBe(true);
	});

	it("keeps a declined checkpoint on the paid screen", () => {
		const state = purchaseState(
			{
				...ready,
				curatorKind: CheckpointCuratorKind.Human,
				curatorDeclinedAt: "2026-10-18T09:00:00.000Z",
			},
			null,
		);
		expect(state.paid).toBe(true);
	});

	it("has nothing to show without a checkpoint", () => {
		const state = purchaseState(null, "ready");
		expect(state).toMatchObject({
			paid: false,
			running: false,
			isDraft: false,
		});
	});
});
