/**
 * Development utility to monitor component re-renders
 * Helps identify unnecessary re-renders during development
 */

const renderCounts: Map<string, number> = new Map();
const lastRenderTime: Map<string, number> = new Map();

export function trackRender(
	componentName: string,
	props?: Record<string, unknown>,
) {
	if (process.env.NODE_ENV !== "development") return;

	const now = Date.now();
	const count = (renderCounts.get(componentName) || 0) + 1;
	const lastTime = lastRenderTime.get(componentName);

	renderCounts.set(componentName, count);
	lastRenderTime.set(componentName, now);

	const timeSinceLastRender = lastTime ? now - lastTime : 0;

	// Always log first render and rapid re-renders
	// For other renders, only log if they happen within 500ms (likely navigation-related)
	if (count === 1 || timeSinceLastRender < 500) {
		const isRapid = timeSinceLastRender > 0 && timeSinceLastRender < 100;
		const logMethod = isRapid ? console.warn : console.log;

		logMethod(
			`🔄 [${componentName}] Render #${count}${isRapid ? ` - ⚠️ RAPID! (${timeSinceLastRender}ms)` : timeSinceLastRender > 0 ? ` (${timeSinceLastRender}ms since last)` : ""}`,
		);

		if (props) {
			logMethod("  Props:", props);
		}

		if (isRapid || count <= 3) {
			console.trace("  Stack trace:");
		}
	}
}

export function resetRenderCounts() {
	renderCounts.clear();
	lastRenderTime.clear();
}

export function getRenderStats() {
	return {
		counts: Object.fromEntries(renderCounts),
		lastRenderTimes: Object.fromEntries(lastRenderTime),
	};
}
