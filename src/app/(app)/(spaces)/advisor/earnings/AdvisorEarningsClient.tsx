"use client";

import { EarningsPage } from "@/components/advisor/EarningsPage";
import { useCuratorEarnings } from "@/hooks/payouts";

export function AdvisorEarningsClient() {
	const { data, status, refetch } = useCuratorEarnings();

	return (
		<EarningsPage
			data={data}
			// A failed refetch keeps the earnings already on screen.
			status={data ? "success" : status}
			onRetry={refetch}
		/>
	);
}
