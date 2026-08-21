import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { Dayjs } from "dayjs";
import type {
	ViewReportSubject,
	ViewsReportResponse,
	ViewsTopResponse,
} from "@/types/admin-views";

export type ViewsRange = [Dayjs, Dayjs];

/** The wire format for both endpoints: a day, not an instant. */
const DAY = "YYYY-MM-DD";

const params = (range: ViewsRange) => ({
	from: range[0].format(DAY),
	to: range[1].format(DAY),
});

/**
 * View counts move once a day, not once a second, so five minutes of staleness
 * is free — and coming back to this tab and seeing the same numbers is the
 * expected answer, not a bug the way it is in the audit log.
 */
const CACHE = { staleTime: 5 * 60_000, refetchOnWindowFocus: false } as const;

export const useViewsReport = (range: ViewsRange | null) =>
	useQuery({
		queryKey: ["admin", "views", range && params(range)],
		queryFn: () =>
			axios
				.get<ViewsReportResponse>("/api/admin/views", {
					params: params(range as ViewsRange),
				})
				.then((response) => response.data),
		enabled: !!range,
		// The next range replaces the previous one in place; blanking the page
		// between two reads of the same numbers is a worse answer than a dimmed one.
		placeholderData: (previous) => previous,
		...CACHE,
	});

export const useViewsTop = (
	subject: ViewReportSubject,
	range: ViewsRange | null,
) =>
	useQuery({
		queryKey: ["admin", "views", "top", subject, range && params(range)],
		queryFn: () =>
			axios
				.get<ViewsTopResponse>("/api/admin/views/top", {
					params: { type: subject, ...params(range as ViewsRange) },
				})
				.then((response) => response.data),
		enabled: !!range,
		placeholderData: (previous) => previous,
		...CACHE,
	});
