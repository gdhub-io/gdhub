"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { ShareCardDto } from "@/types/checkpoints";

/** The verdict share card; the first fetch has the curator write its line, so it waits for the window (GDHUB-144). */
export const useShareCard = (checkpointId: string, open: boolean) =>
	useQuery({
		queryKey: ["checkpoint", checkpointId, "share"],
		queryFn: () =>
			axios
				.get<ShareCardDto>(`/api/checkpoint/${checkpointId}/share`)
				.then((response) => response.data),
		enabled: open,
		staleTime: Number.POSITIVE_INFINITY,
	});
