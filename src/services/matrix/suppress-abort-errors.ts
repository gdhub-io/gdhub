/**
 * matrix-js-sdk внутри использует AbortController для sync/HTTP-запросов.
 * При размонтировании компонента (в т.ч. дважды в React Strict Mode dev)
 * Next ловит эти отмены как unhandled rejection и показывает в overlay.
 * AbortError семантически — не ошибка, а штатный сигнал "операцию отменили".
 *
 * Идемпотентно: повторные вызовы — no-op.
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
