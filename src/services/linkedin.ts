// Posts plain-text updates to a LinkedIn company page via the Posts API.
// Requires an org token with the `w_organization_social` scope.
//
// Token handling: LinkedIn access tokens are short-lived (~60 days). When a
// refresh token + client credentials are configured, the service mints a fresh
// access token on demand and caches it in-process until shortly before expiry.
// A static LINKEDIN_ACCESS_TOKEN is used as a fallback when refresh is not set.
//
// Designed fail-safe: sharePost swallows errors and returns { ok: false } so a
// LinkedIn outage (or an expired token) never breaks the calling job.

const LINKEDIN_POSTS_URL = "https://api.linkedin.com/rest/posts";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
// Pinned LinkedIn-Version (YYYYMM). LinkedIn keeps roughly the last 12 months
// active and rejects older ones with 426 NONEXISTENT_VERSION; override via env
// (LINKEDIN_API_VERSION) when this one ages out.
const DEFAULT_API_VERSION = "202606";
// Refresh a bit before the real expiry to avoid races on a token about to lapse.
const EXPIRY_SAFETY_MS = 60_000;

// LinkedIn renders `commentary` as "Little Text Format", where these characters
// carry markup meaning. An unescaped one makes LinkedIn silently truncate the
// post at that character, so every commentary is escaped before it is sent.
const LITTLE_TEXT_RESERVED = /[\\|{}@[\]()<>#*_~]/g;

export const escapeLinkedInText = (text: string) =>
	text.replace(LITTLE_TEXT_RESERVED, (char) => `\\${char}`);

type RefreshCredentials = {
	refreshToken: string;
	clientId: string;
	clientSecret: string;
};

// Process-wide cache: a refreshed access token is reusable across requests on a
// warm instance. A cold start simply mints a new one.
let tokenCache: { accessToken: string; expiresAt: number } | null = null;

export default class LinkedInService {
	private authorUrn: string;
	private apiVersion: string;
	private staticToken?: string;
	private refresh?: RefreshCredentials;

	private constructor(args: {
		authorUrn: string;
		apiVersion: string;
		staticToken?: string;
		refresh?: RefreshCredentials;
	}) {
		this.authorUrn = args.authorUrn;
		this.apiVersion = args.apiVersion;
		this.staticToken = args.staticToken;
		this.refresh = args.refresh;
	}

	/** True when enough env is present to post (org URN + a token source). */
	static isConfigured() {
		if (!process.env.LINKEDIN_ORG_URN) return false;
		const hasRefresh = Boolean(
			process.env.LINKEDIN_REFRESH_TOKEN &&
				process.env.LINKEDIN_CLIENT_ID &&
				process.env.LINKEDIN_CLIENT_SECRET,
		);
		return hasRefresh || Boolean(process.env.LINKEDIN_ACCESS_TOKEN);
	}

	static init() {
		const org = process.env.LINKEDIN_ORG_URN;
		if (!org) throw new Error("LINKEDIN_ORG_URN is not set");

		// Accept either a full URN or a bare numeric id.
		const authorUrn = org.startsWith("urn:li:organization:")
			? org
			: `urn:li:organization:${org}`;

		const refreshToken = process.env.LINKEDIN_REFRESH_TOKEN;
		const clientId = process.env.LINKEDIN_CLIENT_ID;
		const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
		const staticToken = process.env.LINKEDIN_ACCESS_TOKEN;

		const refresh =
			refreshToken && clientId && clientSecret
				? { refreshToken, clientId, clientSecret }
				: undefined;

		if (!refresh && !staticToken) {
			throw new Error(
				"LinkedIn credentials missing: set LINKEDIN_REFRESH_TOKEN (+ LINKEDIN_CLIENT_ID/SECRET) or LINKEDIN_ACCESS_TOKEN",
			);
		}

		return new LinkedInService({
			authorUrn,
			apiVersion: process.env.LINKEDIN_API_VERSION || DEFAULT_API_VERSION,
			staticToken,
			refresh,
		});
	}

	private async ensureAccessToken(): Promise<string> {
		// Refresh flow takes precedence so the page keeps posting unattended.
		if (this.refresh) {
			const now = Date.now();
			if (tokenCache && tokenCache.expiresAt > now + EXPIRY_SAFETY_MS) {
				return tokenCache.accessToken;
			}
			tokenCache = await this.refreshAccessToken(this.refresh);
			return tokenCache.accessToken;
		}

		if (this.staticToken) return this.staticToken;
		throw new Error("No LinkedIn access token available");
	}

	private async refreshAccessToken(refresh: RefreshCredentials) {
		const body = new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: refresh.refreshToken,
			client_id: refresh.clientId,
			client_secret: refresh.clientSecret,
		});

		const res = await fetch(LINKEDIN_TOKEN_URL, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body,
		});

		if (!res.ok) {
			const text = await res.text().catch(() => "");
			throw new Error(`LinkedIn token refresh ${res.status}: ${text}`);
		}

		const data = (await res.json()) as {
			access_token: string;
			expires_in: number;
			refresh_token?: string;
		};

		// LinkedIn usually keeps the same refresh token, but warn if it rotated so
		// the operator can update the env before the old one lapses.
		if (data.refresh_token && data.refresh_token !== refresh.refreshToken) {
			console.warn(
				"[LinkedInService] LinkedIn returned a rotated refresh_token — update LINKEDIN_REFRESH_TOKEN env to keep auto-refresh working.",
			);
		}

		return {
			accessToken: data.access_token,
			expiresAt: Date.now() + data.expires_in * 1000,
		};
	}

	async sharePost(commentary: string) {
		try {
			const accessToken = await this.ensureAccessToken();

			const res = await fetch(LINKEDIN_POSTS_URL, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
					"X-Restli-Protocol-Version": "2.0.0",
					"LinkedIn-Version": this.apiVersion,
				},
				body: JSON.stringify({
					author: this.authorUrn,
					commentary: escapeLinkedInText(commentary),
					visibility: "PUBLIC",
					distribution: {
						feedDistribution: "MAIN_FEED",
						targetEntities: [],
						thirdPartyDistributionChannels: [],
					},
					lifecycleState: "PUBLISHED",
					isReshareDisabledByAuthor: false,
				}),
			});

			if (!res.ok) {
				const text = await res.text().catch(() => "");
				// A 401 likely means a stale cached token; drop it so the next call refreshes.
				if (res.status === 401) tokenCache = null;
				throw new Error(`LinkedIn API ${res.status}: ${text}`);
			}

			return { ok: true, id: res.headers.get("x-restli-id") ?? undefined };
		} catch (error) {
			console.error("[LinkedInService.sharePost]", error);
			return { ok: false };
		}
	}
}
