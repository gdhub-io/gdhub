import type prismaClient from "@gdhub-io/gdhub-prisma/dist/client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

export const useCurrentCourse = () => {
	const router = useRouter();
	const { courseId } = router.query;
	const { data: session } = useSession();

	const {
		data: course,
		refetch,
		isLoading,
		isFetched,
	} = useQuery({
		queryKey: ["course", courseId],
		queryFn: () =>
			axios.get<prismaClient.Course>(`/api/user/course/${courseId}`),
		enabled: !!courseId,
		refetchOnWindowFocus: false,
	});

	return { course: course?.data, refetch, isLoading, isFetched };
};
