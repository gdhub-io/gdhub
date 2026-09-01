import { describe, expect, it } from "vitest";
import {
	avatarImage,
	canOptimizeImage,
	imageSrcSet,
	isSanityImage,
	optimizedImage,
} from "@/helpers/image";
import { contentImageLoader } from "@/lib/image-loader";

const SANITY =
	"https://cdn.sanity.io/images/3ao2jrg0/prod/6819158b4ecfd87ff4aac88b84dbb433d863d76d-1920x1080.jpg";
const GOOGLE = "https://lh3.googleusercontent.com/a/ACg8ocK=s96-c";

describe("isSanityImage", () => {
	it("recognises uploads we control", () => {
		expect(isSanityImage(SANITY)).toBe(true);
		expect(isSanityImage(GOOGLE)).toBe(false);
		expect(isSanityImage("/images/local.png")).toBe(false);
		expect(isSanityImage(null)).toBe(false);
		expect(isSanityImage("not a url")).toBe(false);
	});
});

describe("optimizedImage", () => {
	it("asks Sanity for the painted size", () => {
		const url = new URL(optimizedImage(SANITY, { width: 640 }));

		expect(url.searchParams.get("w")).toBe("640");
		expect(url.searchParams.get("q")).toBe("80");
		expect(url.searchParams.get("auto")).toBe("format");
		// Width only — never crop an aspect ratio the caller did not ask for.
		expect(url.searchParams.get("fit")).toBe("max");
	});

	it("crops once both dimensions are known", () => {
		const url = new URL(optimizedImage(SANITY, { width: 320, height: 180 }));

		expect(url.searchParams.get("h")).toBe("180");
		expect(url.searchParams.get("fit")).toBe("crop");
	});

	it("pins the format when the consumer cannot negotiate one", () => {
		const url = new URL(optimizedImage(SANITY, { width: 1200, format: "jpg" }));

		expect(url.searchParams.get("fm")).toBe("jpg");
		expect(url.searchParams.has("auto")).toBe(false);
	});

	it("leaves foreign hosts and empty values alone", () => {
		expect(optimizedImage(GOOGLE, { width: 64 })).toBe(GOOGLE);
		expect(optimizedImage(null)).toBeUndefined();
	});
});

describe("avatarImage", () => {
	it("requests a square at retina density", () => {
		const url = new URL(avatarImage(SANITY, 32));

		expect(url.searchParams.get("w")).toBe("32");
		expect(url.searchParams.get("h")).toBe("32");
		expect(url.searchParams.get("dpr")).toBe("2");
		expect(url.searchParams.get("fit")).toBe("crop");
	});
});

describe("imageSrcSet", () => {
	it("offers every width as a candidate", () => {
		const srcSet = imageSrcSet(SANITY, [480, 960]);

		expect(srcSet).toContain("&auto=format 480w");
		expect(srcSet).toContain("&auto=format 960w");
		expect(srcSet).toContain("w=480");
		expect(srcSet).toContain("w=960");
	});

	it("has nothing to offer for a host that cannot resize", () => {
		expect(imageSrcSet(GOOGLE)).toBeUndefined();
	});
});

describe("canOptimizeImage", () => {
	it("keeps hosts Next is not configured for out of the optimizer", () => {
		expect(canOptimizeImage(SANITY)).toBe(true);
		expect(canOptimizeImage(GOOGLE)).toBe(true);
		expect(canOptimizeImage("/images/local.png")).toBe(true);
		expect(canOptimizeImage("https://evil.example.com/a.png")).toBe(false);
	});
});

describe("contentImageLoader", () => {
	it("sends Sanity uploads to Sanity's own CDN", () => {
		const url = contentImageLoader({ src: SANITY, width: 828, quality: 90 });

		expect(url.startsWith("https://cdn.sanity.io/")).toBe(true);
		expect(new URL(url).searchParams.get("q")).toBe("90");
	});

	it("keeps every other host on Next's optimizer at an allowed quality", () => {
		const url = contentImageLoader({ src: GOOGLE, width: 64 });

		expect(url).toBe(
			`/_next/image?url=${encodeURIComponent(GOOGLE)}&w=64&q=75`,
		);
	});
});
