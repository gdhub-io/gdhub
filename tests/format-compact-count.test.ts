import { describe, expect, it } from "vitest";
import { formatCompactCount } from "@/helpers/format";

describe("formatCompactCount", () => {
	it("leaves counts below a thousand alone", () => {
		expect(formatCompactCount(0)).toBe("0");
		expect(formatCompactCount(7)).toBe("7");
		expect(formatCompactCount(999)).toBe("999");
	});

	it("compacts thousands and millions", () => {
		expect(formatCompactCount(1000)).toBe("1k");
		expect(formatCompactCount(1234)).toBe("1.2k");
		expect(formatCompactCount(999_999)).toBe("999.9k");
		expect(formatCompactCount(2_300_000)).toBe("2.3M");
		expect(formatCompactCount(5_000_000_000)).toBe("5B");
	});

	it("truncates instead of rounding up", () => {
		// 1999 is not yet two thousand, and 1_099_000 is not yet 1.1M.
		expect(formatCompactCount(1999)).toBe("1.9k");
		expect(formatCompactCount(1_099_000)).toBe("1M");
	});

	it("follows the locale's decimal separator", () => {
		expect(formatCompactCount(1234, "ru")).toBe("1,2k");
		expect(formatCompactCount(1234, "en")).toBe("1.2k");
	});

	it("survives negatives and non-numbers", () => {
		expect(formatCompactCount(-1234)).toBe("-1.2k");
		expect(formatCompactCount(Number.NaN)).toBe("0");
	});
});
