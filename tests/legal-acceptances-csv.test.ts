import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/prisma", () => ({ prisma: {} }));

const { acceptancesCsv } = await import(
	"@/repositories/legal-acceptances.repository"
);

const row = (userAgent: string) => ({
	id: "a1",
	user: { id: "u1", name: "Ann", email: "ann@example.com" },
	code: "TermsOfUse",
	title: "Terms of Use",
	version: 1,
	context: "SignUp",
	subject: null,
	acceptedAt: "2026-10-17T10:00:00.000Z",
	validUntil: null,
	ipAddress: "192.0.2.1",
	userAgent,
	checksum: "abc",
});

describe("acceptancesCsv", () => {
	it("quotes every cell and doubles quotes inside", () => {
		const [, line] = acceptancesCsv([row('Mozilla "5.0", x')]).split("\r\n");
		expect(line).toContain('"Mozilla ""5.0"", x"');
	});

	it("never hands a spreadsheet a formula from user-controlled text", () => {
		const [, line] = acceptancesCsv([row("=HYPERLINK(1)")]).split("\r\n");
		expect(line).toContain(`"'=HYPERLINK(1)"`);
	});

	it("leaves an empty cell for a missing value", () => {
		const [, line] = acceptancesCsv([row("ua")]).split("\r\n");
		expect(line.split(",")[7]).toBe('""');
	});

	it("says an acceptance still binds when nothing has replaced it", () => {
		const [header, line] = acceptancesCsv([row("ua")]).split("\r\n");
		expect(header.split(",")[1]).toBe("valid_until");
		expect(line.split(",")[1]).toBe('"current"');
	});
});
