import { defineSpace } from "./define-space";

/**
 * The advisor's own workspace: incoming questions, the reviews they leave after
 * pitch streams, and the terms they take work on.
 *
 * It belongs to the advisor, not to a conversation — askers are never members,
 * or the space would duplicate the chat. Single-instance like scout, and no
 * `team` / `invite`: an advisor works alone.
 */
export const advisorSpace = defineSpace({
	type: "advisor",
	features: {
		requests: ["view", "manage"],
		// The author's side of `ProjectEstimation` — the rows the scout card reads.
		reviews: ["view", "create", "manage", "delete"],
		settings: ["view", "manage"],
	},
});
