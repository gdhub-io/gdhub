import type { StatusTone } from "@/components/ui/StatusDot";
import { AdviceRequestStatus } from "@/config/prisma-enums";

/**
 * How a stored status reads in the advisor's inbox.
 *
 * The words are the advisor's, not the database's: `Created` is a question
 * nobody has answered yet, `Executed` is one that has been. `Closed` is what
 * the asker's cancel and the reminder cron write, so it is withdrawn rather
 * than declined — telling the two apart is the whole reason this map exists
 * instead of showing the enum.
 */
export const REQUEST_STATUS: Record<
	AdviceRequestStatus,
	{ tone: StatusTone; key: string; label: string }
> = {
	[AdviceRequestStatus.Created]: {
		tone: "info",
		key: "advisor.requests.status.new",
		label: "New",
	},
	[AdviceRequestStatus.Approved]: {
		tone: "warning",
		key: "advisor.requests.status.inProgress",
		label: "In progress",
	},
	[AdviceRequestStatus.Executed]: {
		tone: "success",
		key: "advisor.requests.status.answered",
		label: "Answered",
	},
	[AdviceRequestStatus.Rejected]: {
		tone: "danger",
		key: "advisor.requests.status.declined",
		label: "Declined",
	},
	[AdviceRequestStatus.Closed]: {
		tone: "neutral",
		key: "advisor.requests.status.withdrawn",
		label: "Withdrawn",
	},
};
