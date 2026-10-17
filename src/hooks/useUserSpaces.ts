import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { UserSpaces } from "@/repositories/user-spaces";

/** Shared with the `(app)` layout, which prefetches it on the server. */
export const USER_SPACES_QUERY_KEY = ["user-spaces"] as const;

export const useUserSpaces = () =>
	useQuery<UserSpaces>({
		queryKey: USER_SPACES_QUERY_KEY,
		queryFn: () =>
			axios.get<UserSpaces>("/api/user/spaces").then((res) => res.data),
		staleTime: 60 * 1000,
	});
