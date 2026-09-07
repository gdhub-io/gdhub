import { describe, expect, it } from "vitest";
import { PERSONAS } from "./personas";

/**
 * The catalogue is data, and the ways it can be wrong are all quiet: a repeated
 * email silently makes two personas one account, and a repeated key makes
 * `becomePersona` grant the wrong thing.
 */
describe("persona catalogue", () => {
	it("gives every persona its own account", () => {
		const emails = PERSONAS.map((persona) => persona.email);
		expect(new Set(emails).size).toBe(emails.length);
	});

	it("gives every persona its own key", () => {
		const keys = PERSONAS.map((persona) => persona.key);
		expect(new Set(keys).size).toBe(keys.length);
	});

	/** The sign-in screen only offers these two domains. */
	it("keeps every account on a fixture domain", () => {
		for (const persona of PERSONAS) {
			expect(persona.email).toMatch(/@(gdhub\.local|livinitlarge\.net)$/);
		}
	});

	it("says what each one is for", () => {
		for (const persona of PERSONAS) {
			expect(persona.what.length).toBeGreaterThan(10);
		}
	});

	it("covers the kinds of person a screen has to be checked as", () => {
		expect(PERSONAS.map((persona) => persona.key).sort()).toEqual([
			"advisor",
			"author",
			"educator",
			"hubAdmin",
			"member",
			"organiser",
			"scout",
			"superAdmin",
			"unonboarded",
		]);
	});
});
