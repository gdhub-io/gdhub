import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

export const useCurrentEvent = () => {
	const router = useRouter();
	const { eventId } = router.query;
	const { data: session } = useSession();

	const {
		data: event,
		refetch,
		isLoading,
		isFetched,
	} = useQuery({
		queryKey: ["event", eventId],
		queryFn: () => axios.get<prismaClient.Event>(`/api/user/event/${eventId}`),
		enabled: !!eventId,
		refetchOnWindowFocus: false,
	});

	return { event: event?.data, refetch, isLoading, isFetched };
};
