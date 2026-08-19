"use client";

import { useEffect } from "react";

const RETRY_INTERVAL = 500;
const RETRY_LIMIT = 20;

/**
 * Crisp is injected by GTM, so `$crisp` may only show up seconds after mount —
 * and it only answers commands once its API (`is`) is in place. Retry until it
 * does, then stop.
 */
function setCrispVisible(visible: boolean) {
	let attempts = 0;

	const apply = () => {
		if (typeof window === "undefined") return true;
		if (typeof window.$crisp?.is !== "function") return false;
		window.$crisp.push(["do", visible ? "chat:show" : "chat:hide"]);
		return true;
	};

	if (apply()) return () => {};

	const timer = setInterval(() => {
		attempts += 1;
		if (apply() || attempts >= RETRY_LIMIT) clearInterval(timer);
	}, RETRY_INTERVAL);

	return () => clearInterval(timer);
}

/** Hides the Crisp support bubble while the in-app chat covers that corner. */
export function useHideCrispWidget(hidden: boolean) {
	useEffect(() => {
		const cancel = setCrispVisible(!hidden);
		return () => {
			cancel();
			// the widget must come back even if the chat unmounts while open
			if (hidden) setCrispVisible(true);
		};
	}, [hidden]);
}
