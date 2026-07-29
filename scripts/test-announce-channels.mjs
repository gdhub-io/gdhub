/**
 * Healthcheck for the community-announce channels (Discord + LinkedIn).
 *
 * Sends a clearly-marked test message so you can confirm credentials and
 * permissions are still valid. Mirrors what TelegramService.sendNewVacancies()
 * does for each channel, but standalone (no app/DB involved).
 *
 * LinkedIn note: a company-page post is PUBLIC. By default the script creates a
 * test post and then DELETES it, so a periodic healthcheck leaves nothing on the
 * page while still verifying token + posting permission end-to-end. Pass --keep
 * to leave the post up.
 *
 * Usage:
 *   node -r dotenv/config scripts/test-announce-channels.mjs [discord|linkedin|all] [--keep] [--message "text"]
 *   # or via npm:
 *   bun run test:announce -- linkedin
 *
 * Discord env:   DISCORD_BOT_TOKEN, DISCORD_PROJECT_NEWS_CHANNEL_ID
 *                (optional override: DISCORD_TEST_CHANNEL_ID)
 * LinkedIn env:  LINKEDIN_ORG_URN + either
 *                  LINKEDIN_REFRESH_TOKEN + LINKEDIN_CLIENT_ID + LINKEDIN_CLIENT_SECRET
 *                or LINKEDIN_ACCESS_TOKEN
 *                (optional: LINKEDIN_API_VERSION, default 202409)
 */

import "dotenv/config";

const args = process.argv.slice(2);
const keep = args.includes("--keep");
const msgFlagIdx = args.indexOf("--message");
const customMessage = msgFlagIdx !== -1 ? args[msgFlagIdx + 1] : undefined;
const targetArg =
	args.find((a) => ["discord", "linkedin", "all"].includes(a)) || "all";

const stamp = new Date().toISOString();
const message =
	customMessage || `✅ GDHub announce healthcheck — ${stamp}`;

const LINKEDIN_API_VERSION = process.env.LINKEDIN_API_VERSION || "202606";

let failures = 0;
const ok = (cond, label) => {
	console.log(`  ${cond ? "✓" : "✗"} ${label}`);
	if (!cond) failures++;
};

async function testDiscord() {
	console.log("\n[Discord]");
	const token = process.env.DISCORD_BOT_TOKEN;
	const channelId =
		process.env.DISCORD_TEST_CHANNEL_ID ||
		process.env.DISCORD_PROJECT_NEWS_CHANNEL_ID;

	if (!token || !channelId) {
		console.log(
			"  – skipped (set DISCORD_BOT_TOKEN and DISCORD_PROJECT_NEWS_CHANNEL_ID / DISCORD_TEST_CHANNEL_ID)",
		);
		return;
	}

	const { Client, GatewayIntentBits } = await import("discord.js");
	const client = new Client({
		intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
	});

	try {
		await client.login(token);
		ok(true, "logged in as " + (client.user?.tag ?? "bot"));

		const channel = await client.channels.fetch(channelId);
		if (!channel || !channel.isTextBased()) {
			ok(false, `channel ${channelId} not found or not text-based`);
			return;
		}

		const sent = await channel.send({ content: message });
		ok(Boolean(sent?.id), `message sent (id ${sent?.id})`);
	} catch (error) {
		ok(false, `error: ${error?.message ?? error}`);
	} finally {
		await client.destroy();
	}
}

async function linkedinAccessToken() {
	const refreshToken = process.env.LINKEDIN_REFRESH_TOKEN;
	const clientId = process.env.LINKEDIN_CLIENT_ID;
	const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

	if (refreshToken && clientId && clientSecret) {
		const body = new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: refreshToken,
			client_id: clientId,
			client_secret: clientSecret,
		});
		const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body,
		});
		if (!res.ok) {
			throw new Error(
				`token refresh ${res.status}: ${await res.text().catch(() => "")}`,
			);
		}
		const data = await res.json();
		ok(true, `access token refreshed (expires in ${data.expires_in}s)`);
		return data.access_token;
	}

	if (process.env.LINKEDIN_ACCESS_TOKEN) {
		ok(true, "using static LINKEDIN_ACCESS_TOKEN");
		return process.env.LINKEDIN_ACCESS_TOKEN;
	}

	throw new Error(
		"no credentials (need LINKEDIN_REFRESH_TOKEN + CLIENT_ID/SECRET or LINKEDIN_ACCESS_TOKEN)",
	);
}

async function testLinkedIn() {
	console.log("\n[LinkedIn]");
	const org = process.env.LINKEDIN_ORG_URN;
	if (!org) {
		console.log("  – skipped (set LINKEDIN_ORG_URN)");
		return;
	}
	const authorUrn = org.startsWith("urn:li:organization:")
		? org
		: `urn:li:organization:${org}`;

	let accessToken;
	try {
		accessToken = await linkedinAccessToken();
	} catch (error) {
		ok(false, `auth: ${error?.message ?? error}`);
		return;
	}

	const headers = {
		Authorization: `Bearer ${accessToken}`,
		"Content-Type": "application/json",
		"X-Restli-Protocol-Version": "2.0.0",
		"LinkedIn-Version": LINKEDIN_API_VERSION,
	};

	let postUrn;
	try {
		const res = await fetch("https://api.linkedin.com/rest/posts", {
			method: "POST",
			headers,
			body: JSON.stringify({
				author: authorUrn,
				commentary: message,
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
		postUrn = res.headers.get("x-restli-id");
		ok(res.ok, `post created (${res.status}${postUrn ? `, ${postUrn}` : ""})`);
		if (!res.ok) {
			console.log(`    ${await res.text().catch(() => "")}`);
			return;
		}
	} catch (error) {
		ok(false, `post error: ${error?.message ?? error}`);
		return;
	}

	if (keep) {
		console.log("  – kept the test post (--keep)");
		return;
	}

	if (!postUrn) {
		ok(false, "no post URN returned, cannot clean up — check the page manually");
		return;
	}

	try {
		const res = await fetch(
			`https://api.linkedin.com/rest/posts/${encodeURIComponent(postUrn)}`,
			{ method: "DELETE", headers },
		);
		// LinkedIn returns 204 on a successful delete.
		ok(res.ok || res.status === 204, `test post deleted (${res.status})`);
	} catch (error) {
		ok(false, `delete error: ${error?.message ?? error}`);
	}
}

console.log(`Announce channels healthcheck — target: ${targetArg}`);
console.log(`Message: ${message}`);

if (targetArg === "discord" || targetArg === "all") await testDiscord();
if (targetArg === "linkedin" || targetArg === "all") await testLinkedIn();

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
