/**
 * Points Daily's webhooks at a deployment, for the checkpoint call rooms.
 *
 *   bun run daily:webhook gdhub-staging.vercel.app
 *   bun run daily:webhook https://ddrynau.ngrok.app
 *   bun run daily:webhook --list
 *
 * The app checks every delivery against DAILY_WEBHOOK_SECRET, so the secret
 * registered here must be the one the deployment holds. `.env` gives the local
 * one; for another deployment pass its own in front:
 *
 *   DAILY_WEBHOOK_SECRET=<that deployment's secret> bun run daily:webhook <domain>
 *
 * Daily allows one webhook per Daily domain, and local, staging and production
 * share one. So this moves that webhook to the new address (an update also
 * brings back one Daily switched to FAILED); the address it pointed at before
 * stops getting events.
 */

const API = "https://api.daily.co/v1";
const PATH = "/api/daily/webhooks";
const EVENTS = [
	"meeting.ended",
	"recording.ready-to-download",
	"batch-processor.job-finished",
];

type Webhook = { uuid: string; url: string; state: string; eventTypes: string[] };

const need = (name: string) => {
	const value = process.env[name];
	if (!value) {
		console.error(`${name} is not set`);
		process.exit(1);
	}
	return value;
};

const daily = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
	const response = await fetch(`${API}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${need("DAILY_API_KEY")}`,
			"Content-Type": "application/json",
		},
	});
	const text = await response.text();
	if (!response.ok) {
		console.error(`Daily answered ${response.status}: ${text}`);
		process.exit(1);
	}
	return JSON.parse(text) as T;
};

const listed = async () => {
	const answer = await daily<Webhook[] | { data: Webhook[] }>("/webhooks");
	return Array.isArray(answer) ? answer : answer.data;
};

const show = (hook: Webhook) =>
	console.log(`${hook.state.padEnd(8)} ${hook.uuid}  ${hook.url}`);

/** `gdhub-staging.vercel.app`, `https://…` or a full URL: the app's webhook address. */
const addressOf = (target: string) => {
	const url = new URL(/^https?:\/\//.test(target) ? target : `https://${target}`);
	return `${url.origin}${PATH}`;
};

const [target] = process.argv.slice(2);

if (!target || target === "--help") {
	console.log("bun run daily:webhook <domain | url>   register or refresh");
	console.log("bun run daily:webhook --list            what Daily has");
	process.exit(target ? 0 : 1);
}

if (target === "--list") {
	const hooks = await listed();
	if (!hooks.length) console.log("No webhooks.");
	hooks.forEach(show);
	process.exit(0);
}

const url = addressOf(target);
const body = JSON.stringify({
	url,
	hmac: need("DAILY_WEBHOOK_SECRET"),
	eventTypes: EVENTS,
});
const [existing] = await listed();

// Daily sends a test delivery on both: an address that does not answer 200 is refused here.
const saved = existing
	? await daily<Webhook>(`/webhooks/${existing.uuid}`, { method: "POST", body })
	: await daily<Webhook>("/webhooks", { method: "POST", body });

if (existing && existing.url !== url) {
	console.log(`Moved from ${existing.url}; it gets no events now.`);
}
console.log(existing ? "Updated:" : "Registered:");
show(saved);

export {};
