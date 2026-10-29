import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const markPayoutPaid = vi.fn();

vi.mock("@/auth", () => ({ auth: () => authMock() }));
vi.mock("@/lib/space-guard", () => ({
	withSpaceGuard: () => (handler: unknown) => handler,
}));
vi.mock("@/repositories/checkpoints/payouts", () => ({ listPayouts: vi.fn() }));
vi.mock("@/services/checkpoints/flows/payouts", () => ({
	markPayoutPaid: (...a: unknown[]) => markPayoutPaid(...a),
}));

const { POST } = await import("@/app/api/admin/payouts/route");

const markPaid = (paidOn: string) =>
	(POST as (r: NextRequest, c: unknown) => Promise<Response>)(
		new NextRequest("http://localhost/api/admin/payouts", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				curatorId: "c1",
				month: "2026-09",
				paidOn,
				reference: "REF",
				detailsSeenAt: "2026-10-29T20:00:00.000Z",
			}),
		}),
		{ params: Promise.resolve({}) },
	);

describe("marking a payout paid, by date", () => {
	beforeEach(() => {
		// 22:00 UTC on 29 Oct: already 30 Oct for an admin in Moscow.
		vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-29T22:00:00Z") });
		authMock.mockResolvedValue({
			user: { id: "admin", roles: ["Admin"], onboardingDone: true },
		});
		markPayoutPaid.mockResolvedValue({ ok: true, amount: 233 });
	});
	afterEach(() => vi.useRealTimers());

	it("takes the admin's own today, even when UTC is a day behind", async () => {
		expect((await markPaid("2026-10-30")).status).toBe(200);
	});

	it("refuses a day that is not today anywhere yet", async () => {
		expect((await markPaid("2026-10-31")).status).toBe(400);
		expect(markPayoutPaid).not.toHaveBeenCalled();
	});
});
