import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/waitlist/[feature]/route";
import { joinWaitlist } from "@/repositories/user/feature-waitlist";

const authMock = vi.fn();
const limited = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/rate-limit", () => ({ limitAiCalls: () => limited() }));
vi.mock("@/repositories/user/feature-waitlist", () => ({
	joinWaitlist: vi.fn(),
	isOnWaitlist: vi.fn(),
}));

const post = (feature: string, body?: unknown) =>
	POST(
		new NextRequest(`http://test/api/waitlist/${feature}`, {
			method: "POST",
			body: body === undefined ? undefined : JSON.stringify(body),
		}),
		{ params: Promise.resolve({ feature }) },
		{} as never,
	);

beforeEach(() => {
	vi.clearAllMocks();
	authMock.mockResolvedValue(null);
	limited.mockResolvedValue(null);
});

describe("joining a waitlist", () => {
	it("takes the signed-in account's email, whatever the body says", async () => {
		authMock.mockResolvedValue({
			user: { id: "u1", email: "anna@x.io" },
		});

		const response = await post("ExpertCheckpoint", { email: "other@x.io" });

		expect(response.status).toBe(200);
		expect(joinWaitlist).toHaveBeenCalledWith("ExpertCheckpoint", "anna@x.io");
	});

	it("lets a guest join with an email", async () => {
		const response = await post("ExpertCheckpoint", { email: " guest@x.io " });

		expect(response.status).toBe(200);
		expect(joinWaitlist).toHaveBeenCalledWith("ExpertCheckpoint", "guest@x.io");
	});

	it("refuses a guest with no valid email", async () => {
		const response = await post("ExpertCheckpoint", { email: "nope" });

		expect(response.status).toBe(400);
		expect(joinWaitlist).not.toHaveBeenCalled();
	});

	it("stops a guest past the rate limit before anything is written", async () => {
		limited.mockResolvedValue(new Response(null, { status: 429 }));

		const response = await post("ExpertCheckpoint", { email: "guest@x.io" });

		expect(response.status).toBe(429);
		expect(joinWaitlist).not.toHaveBeenCalled();
	});

	it("knows no waitlist it was not built for", async () => {
		const response = await post("Nope", { email: "guest@x.io" });

		expect(response.status).toBe(404);
		expect(joinWaitlist).not.toHaveBeenCalled();
	});
});
