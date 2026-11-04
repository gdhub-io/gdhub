import { describe, expect, it } from "vitest";
import { signedOutRedirect } from "@/lib/signed-out-redirect";

const target = (pathname: string, search = "") => {
	const url = signedOutRedirect(pathname, search, "https://gdhub.io/x");
	return `${url.pathname}${url.search}`;
};

describe("signedOutRedirect", () => {
	it("sends the entry hub and its items to sign-up with the checkpoint intent", () => {
		expect(target("/checkpoint/new")).toBe("/registration?intent=checkpoint");
		expect(target("/checkpoint/new/about")).toBe(
			"/registration?intent=checkpoint",
		);
		expect(target("/checkpoint/new/project", "?projectId=p1")).toBe(
			"/registration?intent=checkpoint",
		);
	});

	it("sends the checkout to sign-in, back to the same step", () => {
		expect(target("/checkpoint/new/checkout", "?project=tide&step=payment")).toBe(
			`/signin?callbackUrl=${encodeURIComponent("/checkpoint/new/checkout?project=tide&step=payment")}`,
		);
	});

	it("does not take a look-alike path for the hub", () => {
		expect(target("/checkpoint/newer")).toBe(
			`/signin?callbackUrl=${encodeURIComponent("/checkpoint/newer")}`,
		);
	});

	it("keeps the query for every other page", () => {
		expect(target("/hub", "?chat=1&roomId=r1")).toBe(
			`/signin?callbackUrl=${encodeURIComponent("/hub?chat=1&roomId=r1")}`,
		);
	});
});
