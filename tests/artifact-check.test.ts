import { beforeEach, describe, expect, it, vi } from "vitest";
import { isPublicAddress, openLink } from "@/services/artifact-check/safe-fetch";

const fetchMock = vi.fn();
const resolveMock = vi.fn();

vi.mock("undici", () => ({
	Agent: class {},
	fetch: (...args: unknown[]) => fetchMock(...args),
}));
vi.mock("node:dns/promises", () => ({
	lookup: (...args: unknown[]) => resolveMock(...args),
}));

const answer = (status: number, location?: string) => ({
	status,
	ok: status >= 200 && status < 300,
	headers: new Headers(location ? { location } : {}),
	body: { cancel: vi.fn() },
});

beforeEach(() => {
	vi.clearAllMocks();
	resolveMock.mockResolvedValue([{ address: "93.184.215.14", family: 4 }]);
});

describe("which addresses count as public", () => {
	it.each([
		"127.0.0.1",
		"10.1.2.3",
		"172.16.0.1",
		"192.168.1.1",
		"169.254.169.254",
		"100.64.0.1",
		"0.0.0.0",
		"::1",
		"fc00::1",
		"fe80::1",
		"::ffff:127.0.0.1",
	])("refuses %s", (address) => {
		expect(isPublicAddress(address)).toBe(false);
	});

	it("accepts a public address", () => {
		expect(isPublicAddress("93.184.215.14")).toBe(true);
	});
});

describe("opening an artifact's link", () => {
	it("opens a public page", async () => {
		fetchMock.mockResolvedValue(answer(200));

		expect(await openLink("https://www.youtube.com/watch?v=x")).toEqual({
			ok: true,
		});
	});

	it("never fetches a private address given as an IP", async () => {
		expect(await openLink("http://169.254.169.254/latest")).toEqual({
			ok: false,
			reason: "unsafe",
		});
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("never fetches a name that resolves to a private address", async () => {
		resolveMock.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);

		expect(await openLink("http://localhost:3000/")).toEqual({
			ok: false,
			reason: "unsafe",
		});
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("refuses a redirect into a private address", async () => {
		fetchMock.mockResolvedValueOnce(answer(302, "http://10.0.0.5/admin"));

		expect(await openLink("https://example.com/go")).toEqual({
			ok: false,
			reason: "unsafe",
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("refuses anything but http and https", async () => {
		expect(await openLink("file:///etc/passwd")).toEqual({
			ok: false,
			reason: "unsafe",
		});
	});

	it("counts a redirect to a sign-in page as needing a login", async () => {
		fetchMock.mockResolvedValueOnce(
			answer(302, "https://accounts.google.com/ServiceLogin?continue=x"),
		);

		expect(
			await openLink("https://drive.google.com/file/d/abc/view"),
		).toEqual({ ok: false, reason: "needsLogin" });
	});

	it("reads 401 and 403 as needing a login, 404 as gone", async () => {
		fetchMock.mockResolvedValueOnce(answer(403));
		expect(await openLink("https://example.com/a")).toEqual({
			ok: false,
			reason: "needsLogin",
		});

		fetchMock.mockResolvedValueOnce(answer(404));
		expect(await openLink("https://example.com/b")).toEqual({
			ok: false,
			reason: "notFound",
		});
	});

	it("gives up after three redirects", async () => {
		fetchMock.mockResolvedValue(answer(301, "https://example.com/next"));

		expect(await openLink("https://example.com/loop")).toEqual({
			ok: false,
			reason: "tooManyRedirects",
		});
		expect(fetchMock).toHaveBeenCalledTimes(4);
	});

	it("drops the body unread, so a build is never downloaded", async () => {
		const response = answer(200);
		fetchMock.mockResolvedValue(response);

		await openLink("https://example.itch.io/game");

		expect(response.body.cancel).toHaveBeenCalled();
	});
});
