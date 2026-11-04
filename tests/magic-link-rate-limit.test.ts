import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rateLimit = vi.fn();
const nextAuthPost = vi.fn();

vi.mock("@/auth", () => ({
	handlers: {
		GET: vi.fn(),
		POST: (...args: unknown[]) => nextAuthPost(...args),
	},
}));
vi.mock("@/lib/rate-limit", () => ({
	rateLimit: (...args: unknown[]) => rateLimit(...args),
}));

const { POST } = await import("@/app/api/auth/[...nextauth]/route");

const emailSignIn = (email: string) =>
	new NextRequest("https://gdhub.io/api/auth/signin/email", {
		method: "POST",
		headers: {
			"content-type": "application/x-www-form-urlencoded",
			"x-forwarded-for": "203.0.113.7, 10.0.0.1",
		},
		body: new URLSearchParams({ email, csrfToken: "t" }),
	});

beforeEach(() => {
	vi.clearAllMocks();
	nextAuthPost.mockResolvedValue(new Response("ok"));
});

describe("magic-link rate limit", () => {
	it("counts by IP and by the normalised address, then hands over to next-auth", async () => {
		rateLimit.mockResolvedValue(null);

		const response = await POST(emailSignIn(" Dev@GDHub.local "));

		expect(await response.text()).toBe("ok");
		expect(rateLimit.mock.calls.map((call) => call.slice(0, 2))).toEqual([
			["magic-link-ip", "203.0.113.7"],
			["magic-link-email", "dev@gdhub.local"],
		]);
	});

	it("answers 429 with an error next-auth's signIn() can read, sending nothing", async () => {
		rateLimit.mockResolvedValueOnce(null).mockResolvedValueOnce(300);

		const response = await POST(emailSignIn("dev@gdhub.local"));

		expect(response.status).toBe(429);
		expect(response.headers.get("Retry-After")).toBe("300");
		const { url } = await response.json();
		expect(new URL(url).searchParams.get("error")).toBeTruthy();
		expect(nextAuthPost).not.toHaveBeenCalled();
	});

	it("leaves other auth POSTs alone", async () => {
		await POST(
			new NextRequest("https://gdhub.io/api/auth/signout", { method: "POST" }),
		);

		expect(rateLimit).not.toHaveBeenCalled();
		expect(nextAuthPost).toHaveBeenCalled();
	});
});
