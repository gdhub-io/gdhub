import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
	process.env.NEXTAUTH_SECRET ||= "test-secret";
});

const findUnique = vi.fn();
const userUpdate = vi.fn();
const ensureMatrixUser = vi.fn();
const store = new Map<string, unknown>();

// Which legal documents are pending is its own concern, tested in legal-pending.test.ts.
vi.mock("@/repositories/legal.repository", () => ({
	pendingLegalCodes: async () => [],
}));

vi.mock("next-auth", () => ({
	default: () => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }),
}));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: () => ({}) }));
// CI copies .env.example, where provider settings are empty; only the jwt
// callback is under test.
vi.mock("next-auth/providers/nodemailer", () => ({ default: () => ({}) }));
vi.mock("next-auth/providers/google", () => ({ default: () => ({}) }));
vi.mock("@/services/brevo", () => ({ brevoApi: {} }));
vi.mock("@/services/matrix/admin", () => ({
	ensureMatrixUser: (...args: unknown[]) => ensureMatrixUser(...args),
}));
vi.mock("@/services/cache", () => ({
	cacheSet: async (key: string, value: unknown) => {
		store.set(key, value);
	},
	cached: async (key: string, _ttl: number, produce: () => Promise<unknown>) => {
		if (store.has(key)) return store.get(key);
		const value = await produce();
		store.set(key, value);
		return value;
	},
}));
vi.mock("@/services/prisma", () => ({
	prisma: {
		user: {
			findUnique: (...args: unknown[]) => findUnique(...args),
			update: (...args: unknown[]) => userUpdate(...args),
			activeSubscription: async () => null,
		},
		account: { findFirst: async () => null },
		spaceMember: { findUnique: async () => null },
	},
}));

const NOW = new Date("2026-10-15T12:00:00.000Z").getTime();
const SIX_MINUTES = 6 * 60 * 1000;
const EMAIL = "dev@gdhub.local";

async function jwt(token: Record<string, unknown>, trigger?: string) {
	const { authConfig } = await import("@/auth");
	return (authConfig.callbacks?.jwt as any)({ token, trigger });
}

describe("jwt callback: user resync", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		store.clear();
		findUnique.mockReset();
		userUpdate.mockReset();
		ensureMatrixUser.mockReset();
		findUnique.mockResolvedValue({
			id: "u1",
			email: EMAIL,
			name: "Dev",
			matrixUserId: "@u1:gdhub",
			profile: null,
		});
	});

	it("trusts a token synced within the interval", async () => {
		const token = { email: EMAIL, syncedAt: NOW - 1000 };
		expect(await jwt(token)).toBe(token);
		expect(findUnique).not.toHaveBeenCalled();
	});

	it("serves a stale token from the cache, keeping the time it was read", async () => {
		const readAt = NOW - 60_000;
		store.set(`session-user:${EMAIL}`, { name: "Cached", syncedAt: readAt });

		const result = await jwt({ email: EMAIL, syncedAt: NOW - SIX_MINUTES });

		expect(findUnique).not.toHaveBeenCalled();
		expect(result.name).toBe("Cached");
		expect(result.syncedAt).toBe(readAt);
	});

	it("reads the database on a miss and caches the result", async () => {
		await jwt({ email: EMAIL, syncedAt: NOW - SIX_MINUTES });
		await jwt({ email: EMAIL, syncedAt: NOW - SIX_MINUTES });

		expect(findUnique).toHaveBeenCalledTimes(1);
		expect(store.get(`session-user:${EMAIL}`)).toMatchObject({
			id: "u1",
			syncedAt: NOW,
		});
	});

	it("bypasses and refreshes the cache on update, so resyncSession sees fresh data", async () => {
		store.set(`session-user:${EMAIL}`, { name: "Stale", syncedAt: NOW });

		const result = await jwt({ email: EMAIL, syncedAt: NOW }, "update");

		expect(findUnique).toHaveBeenCalledTimes(1);
		expect(result.name).toBe("Dev");
		expect(store.get(`session-user:${EMAIL}`)).toMatchObject({ name: "Dev" });
	});

	it("stores the Matrix id once provisioned, so Synapse is not called again", async () => {
		findUnique.mockResolvedValue({
			id: "u1",
			email: EMAIL,
			matrixUserId: null,
			profile: null,
		});
		ensureMatrixUser.mockResolvedValue({ user_id: "@u1:gdhub" });

		const result = await jwt({ email: EMAIL }, "signIn");

		expect(userUpdate).toHaveBeenCalledWith({
			where: { id: "u1" },
			data: { matrixUserId: "@u1:gdhub" },
		});
		expect(result.matrixUserId).toBe("@u1:gdhub");
	});

	it("still signs in when Synapse is down", async () => {
		findUnique.mockResolvedValue({
			id: "u1",
			email: EMAIL,
			matrixUserId: null,
			profile: null,
		});
		ensureMatrixUser.mockRejectedValue(new Error("down"));
		vi.spyOn(console, "error").mockImplementation(() => {});

		const result = await jwt({ email: EMAIL }, "signIn");

		expect(userUpdate).not.toHaveBeenCalled();
		expect(result.id).toBe("u1");
	});
});
