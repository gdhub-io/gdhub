import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GDHUB-127: the candidate card is its own read (frame 04.07). The contacts it
 * hands the project are the ones the candidate allowed on this application —
 * never the talent card's, which stay locked until an accepted offer.
 */

const findUnique = vi.fn();
vi.mock("@/services/prisma", () => ({
	prisma: { vacancyApplication: { findUnique: (...a: unknown[]) => findUnique(...a) } },
}));
vi.mock("@/repositories/user/person-card", () => ({
	personCardProjectsSelect: {},
	personCardCertificatesSelect: {},
	mapPersonCardProjects: () => [],
	mapPersonCardCertificates: () => [],
}));

const row = (allowedContacts: string[]) => ({
	id: "app1",
	status: "Submitted",
	message: "Hi",
	allowedContacts,
	createdAt: new Date("2026-11-03"),
	vacancy: { id: "v1", title: "Level designer", teamId: "t1", team: { project: { name: "E2E Test Game" } } },
	speciality: { id: "sp1", name: "Level Designer", level: "Experienced", direction: { name: "game design" } },
	user: {
		id: "u1",
		name: "ana",
		image: null,
		email: "ana@example.com",
		updatedAt: new Date("2026-06-12"),
		profile: { name: "Ana Silva", country: "Portugal", city: "Lisbon", timeForWork: [10, 20], motivation: "Levels.", tgNickname: "anasilva", preferredGenres: [], preferredSettings: [], preferredLevels: [] },
		memberInTeams: [],
		memberInEvents: [],
	},
});

const read = async () => {
	const { getCandidateCard } = await import("@/repositories/vacancy/candidate-card");
	return getCandidateCard("app1");
};

beforeEach(() => vi.clearAllMocks());

describe("the candidate card's contacts", () => {
	it("hands over only what the application allows", async () => {
		findUnique.mockResolvedValue(row(["telegram"]));
		const card = await read();
		expect(card?.candidate.email).toBeNull();
		expect(card?.candidate.telegram).toBe("anasilva");
	});

	it("hands over the email when allowed, and no telegram that was not", async () => {
		findUnique.mockResolvedValue(row(["email"]));
		const card = await read();
		expect(card?.candidate.email).toBe("ana@example.com");
		expect(card?.candidate.telegram).toBeNull();
	});

	it("never reads the talent card's offer state", async () => {
		findUnique.mockResolvedValue(row([]));
		await read();
		const { select } = findUnique.mock.calls[0][0];
		expect(select).not.toHaveProperty("viewedAt");
		expect(select.user.select).not.toHaveProperty("availableProjects");
		expect(Object.keys(select.user.select.profile.select).sort()).toEqual(
			["city", "country", "motivation", "name", "preferredGenres", "preferredLevels", "preferredSettings", "tgNickname", "timeForWork"],
		);
	});
});
