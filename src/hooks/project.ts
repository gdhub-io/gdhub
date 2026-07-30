import type { Project } from "@gdhub-io/gdhub-prisma";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

export type CurrentProject = Project & {
	team: { id: string } | null;
};

export const useCurrentProject = () => {
	const params = useParams();
	const slug = params?.slug as string | undefined;
	const { data: session } = useSession();

	const {
		data: project,
		refetch,
		isLoading,
		isFetched,
	} = useQuery({
		queryKey: ["project-data", slug, session?.user.id],
		queryFn: () =>
			axios.get<CurrentProject>("/api/user/project", {
				params: { slug },
			}),
		enabled: !!slug,
		refetchOnWindowFocus: false,
	});

	return { project: project?.data, refetch, isLoading, isFetched };
};
