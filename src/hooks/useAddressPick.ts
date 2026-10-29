"use client";

import { useState } from "react";

/**
 * A sprint or tab the page picked, kept in the address for a reload or a link,
 * without a navigation. `sync: false` keeps it in the page alone, as the lab
 * and the stories do.
 */
export function useAddressPick<T>(
	key: "sprint" | "tab",
	initial: T | null,
	{
		toParam = String,
		sync = true,
	}: { toParam?: (value: T) => string; sync?: boolean } = {},
) {
	const [picked, setPicked] = useState<T | null>(initial);
	const pick = (value: T) => {
		setPicked(value);
		if (!sync) return;
		const url = new URL(window.location.href);
		url.searchParams.set(key, toParam(value));
		window.history.replaceState(null, "", url);
	};
	return [picked, pick] as const;
}
