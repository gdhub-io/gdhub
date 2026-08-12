import type { Event, EventScheduleItem } from "@gdhub-io/gdhub-prisma";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useParams } from "next/navigation";

/**
 * What `GET /api/user/event/[id]` returns: the event with its programme.
 *
 * A speaker is a speciality, not a user — the route selects the speciality's
 * own name plus the person behind it, so that is what this says.
 */
export type EventSpeaker = {
	id: string;
	name: string | null;
	user?: { image: string | null; profile?: { name: string | null } | null };
};

export type EventWithSchedule = Event & {
	schedule: (EventScheduleItem & { speakers?: EventSpeaker[] })[];
};

/**
 * One event, by id.
 *
 * Six components were each writing this query out, all under the same
 * `["event", id]` key but with different generics and different refetch
 * options. React Query caches by key, so whichever mounted first decided what
 * everyone else got, while each call site believed its own type — the settings
 * form thought the entry held only certification fields, the schedule page
 * thought it held the programme. Same request, one shape, one set of options.
 */
export const useEvent = (eventId?: string | null) => {
	const query = useQuery({
		queryKey: ["event", eventId],
		queryFn: () =>
			axios
				.get<EventWithSchedule>(`/api/user/event/${eventId}`)
				.then((res) => res.data),
		enabled: !!eventId,
		refetchOnWindowFocus: false,
	});

	return {
		event: query.data,
		refetch: query.refetch,
		isLoading: query.isLoading,
		isFetched: query.isFetched,
	};
};

/** The event of the space the user is currently in. */
export const useCurrentEvent = () => {
	const params = useParams<{ eventId?: string }>();

	return useEvent(params?.eventId);
};
