export const SHARE_NETWORKS = [
	"linkedin",
	"telegram",
	"x",
	"facebook",
] as const;

export type ShareNetwork = (typeof SHARE_NETWORKS)[number];

/**
 * The network's own "write a post" page with the link already in it. The author
 * posts from their own account; the picture comes from the page's OG tags.
 */
export function shareIntentUrl(
	network: ShareNetwork,
	{ url, text }: { url: string; text: string },
): string {
	switch (network) {
		// LinkedIn takes the link only and builds the rest from the page.
		case "linkedin":
			return `https://www.linkedin.com/sharing/share-offsite/?${new URLSearchParams({ url })}`;
		case "telegram":
			return `https://t.me/share/url?${new URLSearchParams({ url, text })}`;
		case "x":
			return `https://x.com/intent/tweet?${new URLSearchParams({ url, text })}`;
		case "facebook":
			return `https://www.facebook.com/sharer/sharer.php?${new URLSearchParams({ u: url })}`;
	}
}
