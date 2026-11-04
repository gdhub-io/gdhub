import { beforeEach, describe, expect, it, vi } from "vitest";

const deleteSubscriber = vi.fn();
const removeSpecialistFromSearch = vi.fn();
const sanityDelete = vi.fn();

vi.mock("@/services/novu", () => ({
	NovuService: {
		deleteSubscriber: (...args: unknown[]) => deleteSubscriber(...args),
	},
}));
vi.mock("@/services/typesense/sync", () => ({
	removeSpecialistFromSearch: (...args: unknown[]) =>
		removeSpecialistFromSearch(...args),
}));
vi.mock("@/services/sanity", () => ({
	default: { removeAsset: (...args: unknown[]) => sanityDelete(...args) },
}));

const { eraseFromProviders } = await import(
	"@/services/privacy/erase-external"
);

const subject = {
	userId: "u1",
	email: "dev@gdhub.local",
	image: "https://cdn.sanity.io/images/p/d/avatar.png",
	specialityIds: ["s1", "s2"],
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("eraseFromProviders", () => {
	it("removes the search documents, both Novu subscribers and the Sanity avatar", async () => {
		await eraseFromProviders(subject);

		expect(removeSpecialistFromSearch.mock.calls).toEqual([["s1"], ["s2"]]);
		expect(deleteSubscriber.mock.calls).toEqual([["u1"], ["dev@gdhub.local"]]);
		expect(sanityDelete).toHaveBeenCalledWith(
			"https://cdn.sanity.io/images/p/d/avatar.png",
		);
	});

	it("leaves an avatar hosted elsewhere alone", async () => {
		await eraseFromProviders({
			...subject,
			image: "https://lh3.googleusercontent.com/a/x",
		});

		expect(sanityDelete).not.toHaveBeenCalled();
	});

	it("carries on when a provider fails", async () => {
		deleteSubscriber.mockRejectedValue(new Error("novu down"));

		await expect(eraseFromProviders(subject)).resolves.toBeUndefined();
		expect(sanityDelete).toHaveBeenCalled();
	});
});
