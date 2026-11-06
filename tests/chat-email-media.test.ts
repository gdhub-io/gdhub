import { describe, expect, it } from "vitest";
import { emailMediaThumbnailPath } from "../src/lib/chat/email-media";

const HS = "matrix.gdhub.io";
const ID = "AbCdEfGhIjKlMnOpQrStUvWx";
const q = (s: string) => new URLSearchParams(s);
const OK = "width=80&height=80&method=crop";

describe("emailMediaThumbnailPath", () => {
	it("asks the homeserver for an authenticated thumbnail", () => {
		expect(emailMediaThumbnailPath(HS, ID, q(OK), HS)).toBe(
			`/_matrix/client/v1/media/thumbnail/${HS}/${ID}?width=80&height=80&method=crop&animated=false`,
		);
	});

	it("refuses media from another homeserver", () => {
		expect(emailMediaThumbnailPath("evil.example", ID, q(OK), HS)).toBeNull();
	});

	it("refuses anything but a plain media id", () => {
		for (const id of ["../admin", "a%2Fb", "short", `${ID}/x`]) {
			expect(emailMediaThumbnailPath(HS, id, q(OK), HS)).toBeNull();
		}
	});

	it("never serves an original or an oversized thumbnail", () => {
		for (const query of [
			"",
			"width=80&height=80",
			"width=801&height=80&method=scale",
			"width=80&height=601&method=scale",
			"width=0&height=80&method=crop",
			"width=80&height=80&method=original",
		]) {
			expect(emailMediaThumbnailPath(HS, ID, q(query), HS)).toBeNull();
		}
	});
});
