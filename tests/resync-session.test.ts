import { describe, expect, it, vi } from "vitest";
import { resyncSession } from "@/helpers/session";

describe("resyncSession", () => {
	// next-auth only POSTs to /api/auth/session — the request that runs the `jwt`
	// callback with `trigger: "update"` — when `update()` receives an argument.
	it("passes a defined argument to update()", async () => {
		const update = vi.fn().mockResolvedValue(null);

		await resyncSession(update);

		expect(update).toHaveBeenCalledTimes(1);
		expect(update.mock.calls[0][0]).toBeDefined();
	});
});
