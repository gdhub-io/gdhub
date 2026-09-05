import { defineSpace } from "./define-space";

/**
 * The advisor's own workspace: the questions waiting for them, the reviews they
 * leave after pitch streams, and the terms they take work on.
 *
 * The space belongs to the advisor, not to a conversation. People who ask
 * questions never enter it and are never added as members — their side of the
 * same feature stays in the hub (`/hub/experts`, `/user/advice-requests`), and
 * a space holding both would only duplicate the chat.
 *
 * Single-instance, like scout: every advisor works in the same space and sees
 * their own rows in it. No `team` and no `invite` — an advisor works alone.
 */
export const advisorSpace = defineSpace({
	type: "advisor",
	features: {
		// The inbox: accept, decline, mark done.
		requests: ["view", "manage"],
		// The author's side of `ProjectEstimation` — the rows the scout card reads.
		reviews: ["view", "create", "manage", "delete"],
		// Speciality, questions, response rate, auto-decline, pause.
		settings: ["view", "manage"],
	},
});
