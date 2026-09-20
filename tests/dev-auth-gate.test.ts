import { afterEach, describe, expect, it, vi } from "vitest";

// `src/auth` builds the whole NextAuth config at import time; these stand in
// for what that pulls along, so the gate itself can be read under a node test.
vi.mock("next-auth", () => ({
	default: () => ({
		handlers: {},
		auth: vi.fn(),
		signIn: vi.fn(),
		signOut: vi.fn(),
	}),
}));
vi.mock("next-auth/providers/credentials", () => ({
	default: (config: unknown) => config,
}));
vi.mock("next-auth/providers/google", () => ({
	default: (config: unknown) => config,
}));
vi.mock("next-auth/providers/nodemailer", () => ({
	default: (config: unknown) => config,
}));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: () => ({}) }));
vi.mock("../src/services/prisma", () => ({ prisma: {} }));
vi.mock("../src/services/brevo", () => ({ brevoApi: {} }));
vi.mock("../src/services/matrix/admin", () => ({ ensureMatrixUser: vi.fn() }));
vi.mock("nodemailer", () => ({ createTransport: vi.fn() }));

afterEach(() => {
	vi.unstubAllEnvs();
});

async function loadAuth(nodeEnv: string, flag: string) {
	vi.stubEnv("NODE_ENV", nodeEnv);
	vi.stubEnv("E2E_TEST_AUTH", flag);
	vi.resetModules();

	const { isE2EAuth, authConfig } = await import("../src/auth");

	return {
		isE2EAuth,
		hasCredentialsProvider: authConfig.providers.some(
			(provider) => (provider as { id?: string }).id === "e2e-credentials",
		),
	};
}

/**
 * Signing in as someone else by email alone is a development tool — the
 * `/dev-signin` page and the header's "Switch account" menu both hang off this
 * flag, and both are only as safe as it is.
 */
describe("isE2EAuth", () => {
	it("stays shut in production even when the flag is set", async () => {
		const auth = await loadAuth("production", "1");

		expect(auth.isE2EAuth).toBe(false);
		expect(auth.hasCredentialsProvider).toBe(false);
	});

	it("stays shut outside production without the flag", async () => {
		const auth = await loadAuth("development", "");

		expect(auth.isE2EAuth).toBe(false);
		expect(auth.hasCredentialsProvider).toBe(false);
	});

	it("opens only outside production with the flag set", async () => {
		const auth = await loadAuth("development", "1");

		expect(auth.isE2EAuth).toBe(true);
		expect(auth.hasCredentialsProvider).toBe(true);
	});
});
