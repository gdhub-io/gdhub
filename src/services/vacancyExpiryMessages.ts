// Sent through Novu's `default-message` workflow, which uses `title` as the
// subject and `message` as the body of both the email and the in-app notice.

import { ARCHIVE_WARNING_DAYS } from "@/config/vacancy";

export function vacancyArchiveWarning(
	title: string,
	projectName: string,
	pendingCandidates: number,
) {
	const action = pendingCandidates
		? `update its end date or make a decision on the ${pendingCandidates} ${pendingCandidates === 1 ? "candidate" : "candidates"} waiting for your answer`
		: "update its end date";

	return {
		title: `Open position will be archived in ${ARCHIVE_WARNING_DAYS} days`,
		message:
			`Your open position "${title}" in the project "${projectName}" will be archived in ${ARCHIVE_WARNING_DAYS} days and its chats with candidates will be closed. ` +
			`If the position is still relevant, ${action} — otherwise it will close automatically.`,
	};
}

export function candidatesWaiting(
	title: string,
	projectName: string,
	pendingCandidates: number,
) {
	const waiting =
		pendingCandidates === 1
			? "has a candidate who has been waiting for your decision for a week"
			: `has ${pendingCandidates} candidates waiting for your decision, some of them for a week already`;

	return {
		title: "Candidates are waiting for your decision",
		message: `Your open position "${title}" in the project "${projectName}" ${waiting}. Please accept or reject them so they know where they stand.`,
	};
}

export function vacancyArchived(title: string, projectName: string) {
	return {
		title: "Open position archived",
		message: `Your open position "${title}" in the project "${projectName}" was archived because the end date you set for it has passed. Its chats with candidates are closed.`,
	};
}
