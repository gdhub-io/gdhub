import type { Event } from "@gdhub-io/gdhub-prisma";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

export const useCurrentEvent = () => {
	const params = useParams();
	const eventId = params?.eventId as string | undefined;
	const { data: session } = useSession();

	const {
		data: event,
		refetch,
		isLoading,
		isFetched,
	} = useQuery({
		queryKey: ["event", eventId],
		queryFn: () => axios.get<Event>(`/api/user/event/${eventId}`),
		enabled: !!eventId,
		refetchOnWindowFocus: false,
	});

	return { event: event?.data, refetch, isLoading, isFetched };
};
