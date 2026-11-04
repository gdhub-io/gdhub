import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GDHUB-141: every write of the hours a week or of "open to other authors'
 * projects" goes through `saveAvailability`, which appends history only when
 * something actually changed.
 */

const profile = { findUniqueOrThrow: vi.fn(), update: vi.fn(), findUnique: vi.fn() };
const history = { create: vi.fn(), findFirst: vi.fn() };
const tx = { profile, availabilityChange: history };
const authMock = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("@/services/brevo/sync", () => ({ syncUserAvailabilityToBrevo: vi.fn() }));
vi.mock("@/services/prisma", () => ({
	prisma: {
		...tx,
		$transaction: (run: (db: typeof tx) => unknown) => run(tx),
		auditLog: { create: vi.fn() },
	},
}));

const save = async (input: { timeForWork?: number[]; isActive?: boolean }) => {
	const { saveAvailability } = await import("@/repositories/user/availability");
	return saveAvailability("u1", input);
};

beforeEach(() => {
	vi.clearAllMocks();
	profile.findUniqueOrThrow.mockResolvedValue({ timeForWork: [10, 15], isActive: true });
});

describe("saving the time investment", () => {
	it("writes nothing when nothing changed", async () => {
		const result = await save({ timeForWork: [10, 15], isActive: true });

		expect(result.changed).toBe(false);
		expect(profile.update).not.toHaveBeenCalled();
		expect(history.create).not.toHaveBeenCalled();
	});

	it("writes the profile and one history row with the new values", async () => {
		await save({ timeForWork: [20, 25] });

		expect(profile.update).toHaveBeenCalledWith({
			where: { userId: "u1" },
			data: { timeForWork: [20, 25], isActive: true },
		});
		expect(history.create).toHaveBeenCalledWith({
			data: { userId: "u1", minHours: 20, maxHours: 25, openToProjects: true },
		});
	});

	it("keeps the hours when only the switch moves, and records it", async () => {
		await save({ isActive: false });

		expect(history.create).toHaveBeenCalledWith({
			data: { userId: "u1", minHours: 10, maxHours: 15, openToProjects: false },
		});
	});

	it("records cleared hours as empty", async () => {
		await save({ timeForWork: [] });

		expect(history.create).toHaveBeenCalledWith({
			data: { userId: "u1", minHours: null, maxHours: null, openToProjects: true },
		});
	});
});

describe("PUT /api/user/availability", () => {
	const put = async (body: unknown) => {
		const { PUT } = await import("@/app/api/user/availability/route");
		return (PUT as never as (r: NextRequest, c: unknown) => Promise<Response>)(
			new NextRequest("http://localhost/api/user/availability", {
				method: "PUT",
				body: JSON.stringify(body),
				headers: { "content-type": "application/json" },
			}),
			{ params: Promise.resolve({}) },
		);
	};

	beforeEach(() => {
		authMock.mockResolvedValue({ user: { id: "u1", roles: ["Member"], onboardingDone: true } });
		profile.findUnique.mockResolvedValue({ timeForWork: [20, 25], isActive: true });
		history.findFirst.mockResolvedValue({ createdAt: new Date("2026-11-04") });
	});

	it("refuses a range whose start is above its end", async () => {
		const response = await put({ timeForWork: [25, 20], isActive: true });
		expect(response.status).toBe(400);
		expect(profile.update).not.toHaveBeenCalled();
	});

	it("saves a valid range and answers with the current value", async () => {
		const response = await put({ timeForWork: [20, 25], isActive: true });
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ timeForWork: [20, 25], isActive: true });
	});
});
