import { describe, expect, it } from "vitest";
import { invitationAddressedTo } from "@/lib/team-invitation";

describe("invitationAddressedTo", () => {
	const invitation = { email: "Dev@GDHub.local", userId: null };

	it("matches the address it went to, whatever the letter case", () => {
		expect(
			invitationAddressedTo(invitation, { id: "u1", email: "dev@gdhub.local" }),
		).toBe(true);
	});

	it("matches the account it was sent to", () => {
		expect(
			invitationAddressedTo(
				{ email: "old@x.io", userId: "u1" },
				{ id: "u1", email: "new@x.io" },
			),
		).toBe(true);
	});

	it("refuses anyone else, and a user with no email", () => {
		expect(
			invitationAddressedTo(invitation, { id: "u2", email: "other@x.io" }),
		).toBe(false);
		expect(invitationAddressedTo(invitation, { id: "u2", email: null })).toBe(
			false,
		);
	});
});
