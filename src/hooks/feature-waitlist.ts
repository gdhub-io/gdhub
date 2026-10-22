import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { WaitlistFeature } from "@/config/prisma-enums";

const waitlistKey = (feature: WaitlistFeature) => ["feature-waitlist", feature];

/** Whether the signed-in user already waits for the feature; asked only when shown. */
export const useWaitlistStatus = (feature: WaitlistFeature, enabled = true) =>
	useQuery({
		queryKey: waitlistKey(feature),
		queryFn: async () =>
			(await axios.get<{ joined: boolean }>(`/api/waitlist/${feature}`)).data,
		enabled,
	});

export const useJoinWaitlist = (feature: WaitlistFeature) => {
	const queryClient = useQueryClient();
	return useMutation({
		// A guest sends the email; signed in, the account's is used.
		mutationFn: async (email?: string) =>
			(
				await axios.post<{ joined: boolean }>(
					`/api/waitlist/${feature}`,
					email ? { email } : undefined,
				)
			).data,
		onSuccess: (data) => queryClient.setQueryData(waitlistKey(feature), data),
	});
};

export type AdminWaitlist = {
	total: number;
	rows: { id: string; email: string; createdAt: string }[];
};

export const useAdminWaitlist = (feature: WaitlistFeature, query?: string) =>
	useQuery({
		queryKey: ["admin-waitlist", feature, query ?? ""],
		queryFn: async () =>
			(
				await axios.get<AdminWaitlist>("/api/admin/waitlist", {
					params: { feature, q: query || undefined },
				})
			).data,
	});

export type WaitlistLetter = {
	feature: WaitlistFeature;
	/** Only these rows; everyone when absent. */
	ids?: string[];
	title: string;
	message: string;
};

export const useWriteToWaitlist = () =>
	useMutation({
		mutationFn: async (letter: WaitlistLetter) =>
			(
				await axios.post<{ sent: number; failed: number }>(
					"/api/admin/waitlist/write",
					letter,
				)
			).data,
	});
