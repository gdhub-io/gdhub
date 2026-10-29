import { useEffect, useState } from "react";

/**
 * A query parameter a notification link carries, read once and then dropped
 * from the address, so a reload does not act on it a second time.
 */
export function useTakeSearchParam(name: string) {
	const [value, setValue] = useState<string | null>(null);

	useEffect(() => {
		const url = new URL(window.location.href);
		const taken = url.searchParams.get(name);
		if (taken === null) return;

		setValue(taken);
		url.searchParams.delete(name);
		window.history.replaceState(window.history.state, "", url);
	}, [name]);

	return value;
}
