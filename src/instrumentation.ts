export async function register() {
	// `register()` runs in every runtime (Node.js + Edge). The warning-suppression
	// logic touches Node-only APIs (`process.emitWarning`), so load it lazily and
	// only on the Node.js runtime to keep it out of the Edge bundle.
	if (process.env.NEXT_RUNTIME === "nodejs") {
		await import("./instrumentation-node");
	}
}
