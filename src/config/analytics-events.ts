import type { CuratorLevel } from "@/config/checkpoint-pricing";
import {
	CheckpointCuratorKind,
	type CheckpointVerdict,
} from "@/config/prisma-enums";

/**
 * The checkpoint funnel as GTM sees it (GDHUB-95): every event name and the
 * params it is pushed with. Ids, enums, counts and booleans only — never a
 * name, an email, free text or an amount. `docs/analytics/checkpoint-events.md`
 * and the GTM import file list the same events; a test keeps them in step.
 */

export type CuratorKindParam = "ai" | "human";
export type CuratorLevelParam = "experienced" | "expert";
export type CuratorSwitch = "first" | "same" | "ai_to_human" | "human_to_ai";

/** What every purchase event carries, so repeat purchases and AI ↔ expert switches can be counted. */
export type PurchaseParams = {
	checkpoint_id: string;
	project_id: string;
	checkpoint_number: number;
	curator_kind: CuratorKindParam;
	curator_level: CuratorLevelParam | null;
	previous_curator_kind: CuratorKindParam | null;
	curator_switch: CuratorSwitch;
};

export type CheckpointEvents = {
	checkpoint_landing_cta: { section: "hero" | "pricing" | "final_cta" };
	checkpoint_signed_up: { provider: "email" | "google" };
	checkpoint_signed_in: { provider: "email" | "google" };
	checkpoint_hub_reached: { returning: boolean; projects_count: number };
	checkpoint_about_done: { first_time: boolean };
	checkpoint_project_done: {
		project: "new" | "existing";
		lines: number;
		with_evidence: number;
		carried_over: number;
	};
	checkpoint_goal_set: { warned: boolean };
	checkpoint_curator_chosen: PurchaseParams;
	checkpoint_payment_opened: PurchaseParams & { retry: boolean };
	checkpoint_payment_cancelled: Record<string, never>;
	checkpoint_paid: PurchaseParams & {
		outcome: "ai_started" | "expert_reserved";
		promo_used: boolean;
	};
	checkpoint_review_opened: {
		session_index: number;
		curator_kind: CuratorKindParam;
	};
	checkpoint_call_joined: {
		session_index: number;
		role: "team" | "curator";
	};
	checkpoint_plan_saved: { session_index: number };
	checkpoint_pulse_answered: { sprint: number };
	checkpoint_verdict_seen: {
		verdict: CheckpointVerdict;
		curator_kind: CuratorKindParam;
		opened_from: "button" | "link";
	};
	/** Null verdict and kind: the project's first checkpoint, nothing before it. */
	checkpoint_next_planned: {
		next_number: number;
		verdict: CheckpointVerdict | null;
		previous_curator_kind: CuratorKindParam | null;
	};
	checkpoint_stage_moved: { after_verdict: boolean };
};

export type CheckpointEvent = keyof CheckpointEvents;

const PURCHASE_PARAMS = [
	"checkpoint_id",
	"project_id",
	"checkpoint_number",
	"curator_kind",
	"curator_level",
	"previous_curator_kind",
	"curator_switch",
] as const satisfies readonly (keyof PurchaseParams)[];

/** The same map at runtime: what the GTM import and the doc are checked against. */
export const CHECKPOINT_EVENT_PARAMS: {
	[E in CheckpointEvent]: readonly (keyof CheckpointEvents[E])[];
} = {
	checkpoint_landing_cta: ["section"],
	checkpoint_signed_up: ["provider"],
	checkpoint_signed_in: ["provider"],
	checkpoint_hub_reached: ["returning", "projects_count"],
	checkpoint_about_done: ["first_time"],
	checkpoint_project_done: [
		"project",
		"lines",
		"with_evidence",
		"carried_over",
	],
	checkpoint_goal_set: ["warned"],
	checkpoint_curator_chosen: PURCHASE_PARAMS,
	checkpoint_payment_opened: [...PURCHASE_PARAMS, "retry"],
	checkpoint_payment_cancelled: [],
	checkpoint_paid: [...PURCHASE_PARAMS, "outcome", "promo_used"],
	checkpoint_review_opened: ["session_index", "curator_kind"],
	checkpoint_call_joined: ["session_index", "role"],
	checkpoint_plan_saved: ["session_index"],
	checkpoint_pulse_answered: ["sprint"],
	checkpoint_verdict_seen: ["verdict", "curator_kind", "opened_from"],
	checkpoint_next_planned: ["next_number", "verdict", "previous_curator_kind"],
	checkpoint_stage_moved: ["after_verdict"],
};

export const curatorKindParam = (
	kind: CheckpointCuratorKind,
): CuratorKindParam => (kind === CheckpointCuratorKind.AI ? "ai" : "human");

export const curatorLevelParam = (
	level: CuratorLevel | null | undefined,
): CuratorLevelParam | null =>
	level ? (level.toLowerCase() as CuratorLevelParam) : null;

export const curatorSwitch = (
	previous: CuratorKindParam | null,
	current: CuratorKindParam,
): CuratorSwitch => {
	if (!previous) return "first";
	if (previous === current) return "same";
	return current === "human" ? "ai_to_human" : "human_to_ai";
};

/** The purchase params from the draft the wizard holds and the curator level it resolved. */
export const purchaseParams = (
	checkpoint: {
		id: string;
		projectId: string;
		curatorKind: CheckpointCuratorKind;
		number?: number;
		previousCuratorKind?: CheckpointCuratorKind | null;
	},
	level: CuratorLevel | null | undefined,
): PurchaseParams => {
	const kind = curatorKindParam(checkpoint.curatorKind);
	const previous = checkpoint.previousCuratorKind
		? curatorKindParam(checkpoint.previousCuratorKind)
		: null;

	return {
		checkpoint_id: checkpoint.id,
		project_id: checkpoint.projectId,
		checkpoint_number: checkpoint.number ?? 1,
		curator_kind: kind,
		curator_level: kind === "ai" ? null : curatorLevelParam(level),
		previous_curator_kind: previous,
		curator_switch: curatorSwitch(previous, kind),
	};
};
