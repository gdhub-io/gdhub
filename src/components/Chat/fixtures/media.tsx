import type { ReactNode } from "react";
import { brand, neutral } from "@/config/design";
import type { LinkPreview } from "@/helpers/chat-media";
import { ChatMediaContext, type ChatMediaLoaders } from "../media/loaders";

/** A drawn stand-in picture, so stories never touch the network. */
function picture(width: number, height: number): Blob {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${neutral[800]}"/><stop offset="1" stop-color="${brand[600]}"/></linearGradient></defs>
<rect width="100%" height="100%" fill="url(#g)"/>
<circle cx="${width * 0.7}" cy="${height * 0.35}" r="${Math.min(width, height) * 0.12}" fill="${brand[200]}"/>
</svg>`;
	return new Blob([svg], { type: "image/svg+xml" });
}

export const MEDIA = {
	ready: "mxc://fixture.local/ready",
	tall: "mxc://fixture.local/tall",
	loading: "mxc://fixture.local/loading",
	broken: "mxc://fixture.local/broken",
	ogItch: "mxc://fixture.local/og-itch",
	ogYouTube: "mxc://fixture.local/og-youtube",
} as const;

export const LINKS = {
	itch: "https://pixelharbor.itch.io/hollow-tide",
	youtube: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
	docs: "https://docs.google.com/document/d/1x2y3z",
} as const;

const PREVIEWS: Record<string, LinkPreview> = {
	[LINKS.itch]: {
		siteName: "itch.io",
		title: "Hollow Tide by Pixel Harbor",
		description:
			"A tide-bound puzzle adventure about a lighthouse keeper and the sea that keeps rising.",
		imageMxc: MEDIA.ogItch,
	},
	[LINKS.youtube]: {
		siteName: "YouTube",
		title: "Hollow Tide — gameplay trailer",
		imageMxc: MEDIA.ogYouTube,
	},
};

const SIZES: Record<string, [number, number]> = {
	[MEDIA.ready]: [1600, 1200],
	[MEDIA.tall]: [900, 1600],
	[MEDIA.ogItch]: [630, 630],
	[MEDIA.ogYouTube]: [1280, 720],
};

const fixtureLoaders: ChatMediaLoaders = {
	loadMedia: (mxc) => {
		if (mxc === MEDIA.loading) return new Promise(() => undefined);
		const size = SIZES[mxc];
		return size
			? Promise.resolve(picture(...size))
			: Promise.reject(new Error("purged"));
	},
	loadPreview: async (url) => PREVIEWS[url] ?? null,
};

export function MediaFixtures({ children }: { children: ReactNode }) {
	return (
		<ChatMediaContext.Provider value={fixtureLoaders}>
			{children}
		</ChatMediaContext.Provider>
	);
}
