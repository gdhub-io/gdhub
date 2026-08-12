import { describe, expect, it } from "vitest";
import {
	buildContactAttributes,
	toImportAttributes,
} from "@/services/brevo/sync";

type User = Parameters<typeof buildContactAttributes>[0];

const user = (overrides: Partial<User> = {}): User =>
	({
		id: "u1",
		name: "Account Name",
		email: "dev@example.com",
		lang: "en",
		onboardingDone: true,
		agreements: { needSubscribeToNewsletter: true },
		profile: {
			name: "Profile Name",
			primaryInterest: "Game design",
			isActive: true,
		},
		specialities: [],
		...overrides,
	}) as User;

describe("buildContactAttributes", () => {
	it("prefers the profile name over the account name", () => {
		expect(buildContactAttributes(user()).FIRSTNAME).toBe("Profile Name");
	});

	it("falls back to the account name when the profile has none", () => {
		const attributes = buildContactAttributes(
			user({ profile: { name: null, primaryInterest: "Art", isActive: true } }),
		);

		expect(attributes.FIRSTNAME).toBe("Account Name");
	});

	it("takes DIRECTIONS and LEVEL from the first speciality, ignoring the rest", () => {
		const attributes = buildContactAttributes(
			user({
				specialities: [
					{
							level: "Expert",
							isOpenForMentoring: false,
							direction: { name: "Development" },
						},
						{
							level: "Novice",
							isOpenForMentoring: false,
							direction: { name: "2D Art" },
						},
				],
			} as Partial<User>),
		);

		// The direction alone — the level lives in its own attribute.
		expect(attributes.DIRECTIONS).toBe("Development");
		expect(attributes.LEVEL).toBe("Expert");
	});

	it("sends empty values rather than dropping the keys", () => {
		// A speciality the user removed has to disappear from Brevo too, so the
		// key must still be present with a cleared value.
		const attributes = buildContactAttributes(
			user({ profile: null, specialities: [] }),
		);

		expect(attributes).toHaveProperty("LEVEL", null);
		expect(attributes).toHaveProperty("DIRECTIONS", null);
		expect(attributes.MAIN_INTEREST).toBeNull();
	});

	it("says what the person is available for, from the two switches", () => {
		const both = buildContactAttributes(
			user({
				profile: { name: "P", primaryInterest: "Art", isActive: true },
				specialities: [
					{
						level: "Expert",
						isOpenForMentoring: true,
						direction: { name: "Development" },
					},
				],
			} as Partial<User>),
		);

		expect(both.AVAILABLE_FOR).toEqual(["offers", "advising"]);
	});

	it("leaves the list empty when both switches are off", () => {
		const none = buildContactAttributes(
			user({
				profile: { name: "P", primaryInterest: "Art", isActive: false },
				specialities: [
					{
						level: "Expert",
						isOpenForMentoring: false,
						direction: { name: "Development" },
					},
				],
			} as Partial<User>),
		);

		expect(none.AVAILABLE_FOR).toEqual([]);
	});

	it("treats a missing newsletter agreement as no consent", () => {
		expect(
			buildContactAttributes(user({ agreements: {} }))
				.HAS_SUBSCRIBE_TO_NEWSLETTER,
		).toBe(false);

		expect(
			buildContactAttributes(user({ agreements: null }))
				.HAS_SUBSCRIBE_TO_NEWSLETTER,
		).toBe(false);
	});

	it("carries the reading language, so a sync stops undoing the signup", () => {
		expect(buildContactAttributes(user()).MAIN_LOCALE).toBe("en");
	});

	it("carries the onboarding flag through unchanged", () => {
		expect(
			buildContactAttributes(user({ onboardingDone: false })).ONBOARDING_DONE,
		).toBe(false);
	});
});

describe("toImportAttributes", () => {
	// Verified against the account: `POST /contacts/import` silently drops a JSON
	// `true`, a `1` and a `"true"` alike, and only stores a boolean spelled
	// "Yes"/"No". `POST /contacts` takes the real boolean — the two endpoints do
	// not agree, which is why the import payload is encoded separately.
	it("spells booleans the way the import endpoint understands", () => {
		const encoded = toImportAttributes({
			FIRSTNAME: "Probe",
			MAIN_LOCALE: "en",
			MAIN_INTEREST: "Mentor",
			DIRECTIONS: "game design",
			LEVEL: "Experienced",
			ONBOARDING_DONE: true,
			HAS_SUBSCRIBE_TO_NEWSLETTER: false,
			AVAILABLE_FOR: ["offers", "advising"],
		});

		expect(encoded.ONBOARDING_DONE).toBe("Yes");
		expect(encoded.HAS_SUBSCRIBE_TO_NEWSLETTER).toBe("No");
	});

	it("leaves everything else untouched, nulls included", () => {
		const encoded = toImportAttributes({
			FIRSTNAME: "Probe",
			MAIN_LOCALE: "en",
			MAIN_INTEREST: null,
			DIRECTIONS: null,
			LEVEL: null,
			ONBOARDING_DONE: false,
			HAS_SUBSCRIBE_TO_NEWSLETTER: false,
			AVAILABLE_FOR: [],
		});

		expect(encoded.FIRSTNAME).toBe("Probe");
		expect(encoded.DIRECTIONS).toBeNull();
		expect(encoded.LEVEL).toBeNull();
	});

	// Verified against the account: the import endpoint stores a multiple-choice
	// attribute only as an array. `"offers,advising"` — the spelling a CSV import
	// takes — is dropped as silently as a raw boolean is.
	it("keeps a multiple-choice attribute an array", () => {
		const encoded = toImportAttributes({
			FIRSTNAME: "Probe",
			MAIN_LOCALE: "en",
			MAIN_INTEREST: null,
			DIRECTIONS: null,
			LEVEL: null,
			ONBOARDING_DONE: false,
			HAS_SUBSCRIBE_TO_NEWSLETTER: false,
			AVAILABLE_FOR: ["offers", "advising"],
		});

		expect(encoded.AVAILABLE_FOR).toEqual(["offers", "advising"]);
	});
});
