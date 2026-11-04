import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { allowedImage } from "@/helpers/remote-image";

// The OG routes hand `img` to a renderer that fetches it server-side.
describe("allowedImage", () => {
	beforeEach(() => vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://gdhub.io"));
	afterEach(() => vi.unstubAllEnvs());

	it.each([
		"https://cdn.sanity.io/images/3ao2jrg0/prod/abc-616x353.jpg",
		"https://gdhub.io/images/cover.png",
	])("lets our own image host through: %s", (url) => {
		expect(allowedImage(url)).toBe(url);
	});

	it.each([
		"http://169.254.169.254/latest/meta-data/",
		"http://localhost:3000/api/admin",
		"https://evil.example/x.png",
		"http://cdn.sanity.io/images/a.jpg",
		"https://cdn.sanity.io.evil.example/a.jpg",
		"file:///etc/passwd",
		"not a url",
		"",
	])("refuses %s", (url) => {
		expect(allowedImage(url)).toBeNull();
	});

	it("treats a missing parameter as no image", () => {
		expect(allowedImage(null)).toBeNull();
	});
});
