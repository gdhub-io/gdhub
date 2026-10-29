import { CheckpointCuratorKind, CheckpointStatus } from "@/config/prisma-enums";
import { isRunning } from "@/lib/checkpoint-status";
import type { CheckpointDto } from "@/types/checkpoints";
import {
	PURCHASE_STEPS,
	type PurchaseStep,
} from "../checkpoints/start/PurchaseLayout";

export type PurchaseCheckpoint = Pick<
	CheckpointDto,
	| "status"
	| "goal"
	| "curatorKind"
	| "curator"
	| "startedAt"
	| "paymentId"
	| "curatorDeclinedAt"
	| "acceptedTermsAt"
>;

/**
 * What the purchase page shows for the project's current checkpoint and the
 * `?step=` it was opened with. Stripe sends the author back with `?step=ready`.
 */
export function purchaseState(
	current: PurchaseCheckpoint | null,
	asked: string | null | undefined,
) {
	// The furthest question the draft has earned: a step is not skipped by URL.
	const reachable: PurchaseStep = !current?.goal.trim()
		? "goal"
		: // Payment needs day 1: the AI's date, or the first call with a person.
			current.startedAt &&
				(current.curatorKind === CheckpointCuratorKind.AI || current.curator)
			? "payment"
			: "curator";
	const wanted: PurchaseStep =
		asked && PURCHASE_STEPS.includes(asked as PurchaseStep)
			? (asked as PurchaseStep)
			: reachable;
	const step =
		PURCHASE_STEPS.indexOf(wanted) > PURCHASE_STEPS.indexOf(reachable)
			? reachable
			: wanted;

	const backFromCheckout = asked === "ready";
	const isDraft = current?.status === CheckpointStatus.Draft;
	const running = !!current && isRunning(current.status);
	// Paid and not yet running: a person has to take it on, a curator handed it
	// back, or the webhook has not landed — the last only once the terms were
	// taken, so a bare `?step=ready` on an untouched draft is not "paid".
	// The AI curator runs at once, so back from the checkout its open
	// checkpoint is the paid screen too, reload included.
	const paid =
		!!current &&
		(current.status === CheckpointStatus.AwaitingCurator ||
			(isDraft &&
				(!!current.paymentId ||
					!!current.curatorDeclinedAt ||
					(backFromCheckout && !!current.acceptedTermsAt))) ||
			(running &&
				backFromCheckout &&
				current.curatorKind === CheckpointCuratorKind.AI));

	return {
		step,
		isDraft,
		paid,
		// Running, and not the paid screen of an AI one: the workflow shows it now.
		running: running && !paid,
	};
}
