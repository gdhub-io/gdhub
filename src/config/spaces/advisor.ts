import { defineSpace } from "./define-space";

/**
 * The advisor's own workspace: incoming questions, the checkpoints they curate,
 * and the terms they take work on.
 *
 * It belongs to the advisor, not to a conversation — askers are never members,
 * or the space would duplicate the chat. Single-instance like scout, and no
 * `team` / `invite`: an advisor works alone.
 */
export const advisorSpace = defineSpace({
	type: "advisor",
	features: {
		requests: ["view", "manage"],
		// The 28-day runs handed to them: the ones waiting for an answer, the ones
		// under way, and the ones already decided.
		checkpoints: ["view", "manage"],
		settings: ["view", "manage"],
	},
});
