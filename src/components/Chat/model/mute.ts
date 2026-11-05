import type { ConditionKind, IPushRule, IPushRules } from "matrix-js-sdk";

/**
 * Mute is the user's own Matrix push rule, so push and the missed-messages
 * email obey it too: an `override` rule matching the room id with no `notify`
 * action. No SDK runtime here — ChatProvider reads it without bundling the SDK.
 */

export function muteRuleBody(
	roomId: string,
): Pick<IPushRule, "actions" | "conditions"> {
	return {
		conditions: [
			{
				kind: "event_match" as ConditionKind.EventMatch,
				key: "room_id",
				pattern: roomId,
			},
		],
		actions: [],
	};
}

const NOTIFYING = new Set<unknown>(["notify", "coalesce"]);

const silences = (rule: IPushRule) =>
	rule.enabled !== false &&
	!rule.actions.some((action) => NOTIFYING.has(action));

function matchesOnlyRoom(rule: IPushRule): string | null {
	const [condition, ...rest] = (rule.conditions ?? []) as {
		kind: string;
		key?: string;
		pattern?: string;
	}[];
	if (rest.length > 0 || !condition) return null;
	if (condition.kind !== "event_match" || condition.key !== "room_id") {
		return null;
	}
	return condition.pattern ?? null;
}

/** Every room the user has muted, read from `client.pushRules`. */
export function mutedRoomIds(
	pushRules: IPushRules | null | undefined,
): Set<string> {
	const muted = new Set<string>();
	const global = pushRules?.global;
	if (!global) return muted;
	for (const rule of global.override ?? []) {
		const roomId = matchesOnlyRoom(rule);
		if (roomId && silences(rule)) muted.add(roomId);
	}
	// Older clients (and the SDK's own helper) mute with a `room` rule instead.
	for (const rule of global.room ?? []) {
		if (silences(rule)) muted.add(rule.rule_id);
	}
	return muted;
}

export function isRoomMuted(
	pushRules: IPushRules | null | undefined,
	roomId: string,
): boolean {
	return mutedRoomIds(pushRules).has(roomId);
}
