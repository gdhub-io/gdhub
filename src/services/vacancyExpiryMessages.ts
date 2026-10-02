// Sent through Novu's `default-message` workflow, which uses `title` as the
// subject and `message` as the body of both the email and the in-app notice.

export function vacancyArchiveWarning(
	title: string,
	pendingCandidates: number,
) {
	const action = pendingCandidates
		? `update its end date or make a decision on the ${pendingCandidates} ${pendingCandidates === 1 ? "candidate" : "candidates"} waiting for your answer`
		: "update its end date";

	return {
		title: "Vacancy will be archived tomorrow",
		message:
			`Your vacancy "${title}" will be archived tomorrow and its chats with candidates will be closed. ` +
			`If the vacancy is still relevant, ${action} — otherwise it will close automatically in 24 hours.`,
	};
}

export function vacancyArchived(title: string) {
	return {
		title: "Vacancy archived",
		message: `Your vacancy "${title}" was archived because the end date you set for it has passed. Its chats with candidates are closed.`,
	};
}
