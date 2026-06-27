/**
 * Suppress the given Node warning codes at runtime by filtering
 * `process.emitWarning`. Warnings with any other code pass through untouched.
 */
function skipWarnings(codes: string[]) {
	if (process.env.NODE_ENV !== "production") return;

	const skip = new Set(codes);
	const orig = process.emitWarning.bind(process) as (...a: unknown[]) => void;

	process.emitWarning = ((warning: string | Error, ...args: unknown[]) => {
		const code =
			typeof args[0] === "object" && args[0] !== null
				? (args[0] as { code?: string }).code
				: (args[1] as string | undefined);

		if (code && skip.has(code)) return;

		orig(warning, ...args);
	}) as typeof process.emitWarning;
}

export function register() {
	// DEP0169: `url.parse()` runtime warning emitted by Node 24. It comes from
	// transitive deps (axios → follow-redirects, firebase, etc.) we don't control,
	// is harmless, and only adds noise to the function logs.
	skipWarnings(["DEP0169"]);
}
