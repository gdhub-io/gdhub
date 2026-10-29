import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/prisma", () => ({ prisma: {} }));

const { canEditPlan, viewerOf } = await import(
	"@/repositories/checkpoints/viewer"
);

const row = (members: unknown[] = []) => ({
	curatorId: "curator",
	project: { authorId: "author", team: { members } },
});

describe("viewerOf", () => {
	it("tells the curator, the author and the team apart", () => {
		expect(viewerOf(row(), "curator")).toBe("curator");
		expect(viewerOf(row(), "author")).toBe("author");
		expect(viewerOf(row([{ id: "tm1" }]), "member")).toBe("team");
	});

	it("is nobody's for someone off the team", () => {
		expect(viewerOf(row(), "stranger")).toBeNull();
	});

	it("never takes an AI checkpoint's empty curator for the reader", () => {
		const ai = { ...row(), curatorId: null };
		expect(viewerOf(ai, "stranger")).toBeNull();
	});
});

describe("canEditPlan", () => {
	it("is the curator's and the author's, not the rest of the team's", () => {
		expect(canEditPlan(row(), "curator")).toBe(true);
		expect(canEditPlan(row(), "author")).toBe(true);
		expect(canEditPlan(row([{ id: "tm1" }]), "member")).toBe(false);
	});
});
