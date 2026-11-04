"use client";

import { useRouter, useSearchParams } from "next/navigation";

/**
 * The open tab kept in `?{param}=`, so a reload or a shared link lands on it.
 * Anything outside `allowed` reads as `fallback`. Needs a Suspense boundary
 * above it to prerender, as `useSearchParams` does.
 */
export function useUrlTab<Tab extends string>(
	param: string,
	allowed: readonly Tab[],
	fallback: Tab,
) {
	const router = useRouter();
	const requested = useSearchParams().get(param);
	const tab = allowed.find((key) => key === requested) ?? fallback;
	const open = (key: string) =>
		router.replace(`?${param}=${key}`, { scroll: false });

	return [tab, open] as const;
}
