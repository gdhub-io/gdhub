import { describe, expect, it } from "vitest";
import { scopedSearchKey } from "@/lib/typesense-scoped-key";

describe("scopedSearchKey", () => {
	it("matches the example in the Typesense documentation", () => {
		expect(
			scopedSearchKey("RN23GFr1s6jQ9kgSNg2O7fYcAUXU7127", {
				filter_by: "company_id:124",
				expires_at: 1906054106,
			}),
		).toBe(
			"OW9DYWZGS1Q1RGdSbmo0S1QrOWxhbk9PL2kxbTU1eXA3bCthdmE5eXJKRT1STjIzeyJmaWx0ZXJfYnkiOiJjb21wYW55X2lkOjEyNCIsImV4cGlyZXNfYXQiOjE5MDYwNTQxMDZ9",
		);
	});
});
