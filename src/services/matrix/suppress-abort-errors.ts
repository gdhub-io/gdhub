/**
 * matrix-js-sdk uses an AbortController internally for its sync/HTTP calls.
 * When a component unmounts (twice over in React Strict Mode dev) Next catches
 * those cancellations as unhandled rejections and shows them in the overlay.
 * An AbortError is not an error — it is the normal "the operation was
 * cancelled" signal.
 *
 * Idempotent: calling it again is a no-op.
 */
export function installAbortErrorSuppressor(): void {
	if (typeof window === "undefined") return;

	const w = window as Window & { __abortHandlerInstalled?: boolean };
	if (w.__abortHandlerInstalled) return;
	w.__abortHandlerInstalled = true;

	window.addEventListener("unhandledrejection", (event) => {
		const reason = event.reason;

		if (
			reason &&
			typeof reason === "object" &&
			(reason as { name?: string }).name === "AbortError"
		) {
			event.preventDefault();
		}
	});
}
