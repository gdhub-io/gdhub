import { afterEach, describe, expect, it, vi } from "vitest";
import { paddleLive } from "@/services/paddle/environment";

afterEach(() => vi.unstubAllEnvs());

// GDHUB-134: the stand is a production build that must still pay in the sandbox.
describe("paddleLive", () => {
	it("follows the build when nothing says otherwise", () => {
		vi.stubEnv("NEXT_PUBLIC_PADDLE_ENV", "");
		vi.stubEnv("NODE_ENV", "production");
		expect(paddleLive()).toBe(true);
		vi.stubEnv("NODE_ENV", "development");
		expect(paddleLive()).toBe(false);
	});

	it("keeps a production build in the sandbox when told to", () => {
		vi.stubEnv("NODE_ENV", "production");
		vi.stubEnv("NEXT_PUBLIC_PADDLE_ENV", "sandbox");
		expect(paddleLive()).toBe(false);
	});
});
