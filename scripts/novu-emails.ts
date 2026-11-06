/**
 * Writes the email steps from src/services/novu/emails into Novu.
 *
 *   bun run novu:emails            update the Development environment
 *   bun run novu:emails --dry      show what would change, write nothing
 *   bun run novu:emails --promote  copy the workflows from Development to Production
 *
 * Only email steps are touched: their subject and body, as HTML with no Novu
 * layout. In-app and push steps, skip conditions and preferences stay as they
 * are in the dashboard. A workflow the app triggers but Novu lacks is created
 * with an email step and an in-app step.
 */
import { NOVU_EMAILS } from "../src/services/novu/emails/templates";

const BASE = (process.env.NOVU_API_URL || "https://api.novu.co").replace(/\/$/, "");
const SECRET = process.env.NOVU_API_SECRET;
if (!SECRET) throw new Error("NOVU_API_SECRET is not set");

const dry = process.argv.includes("--dry");
const promote = process.argv.includes("--promote");

type Step = {
	_id: string;
	stepId: string;
	name: string;
	type: string;
	controls?: { values?: Record<string, unknown> };
};
type Workflow = Record<string, unknown> & { workflowId: string; steps: Step[] };

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
	const res = await fetch(`${BASE}${path}`, {
		method,
		headers: { Authorization: `ApiKey ${SECRET}`, "Content-Type": "application/json" },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 500)}`);
	return (text ? JSON.parse(text).data : undefined) as T;
}

const getWorkflow = (id: string) =>
	api<Workflow>("GET", `/v2/workflows/${id}`).catch((e: Error) => {
		if (e.message.includes("→ 404")) return null;
		throw e;
	});

function emailControls(step: Step, subject: string, body: string) {
	return {
		...step.controls?.values,
		subject,
		body,
		editorType: "html",
		layoutId: null,
	};
}

async function update(workflow: Workflow, emails: Record<string, { subject: string; body: string }>) {
	const steps = workflow.steps.map((step) => {
		const email = step.type === "email" ? (emails[step.stepId] ?? emails["*"]) : undefined;
		if (step.type === "email" && !email) {
			throw new Error(`${workflow.workflowId}: no template for email step ${step.stepId}`);
		}
		return {
			_id: step._id,
			stepId: step.stepId,
			name: step.name,
			type: step.type,
			controlValues: email
				? emailControls(step, email.subject, email.body)
				: step.controls?.values,
		};
	});
	// Novu flags a variable its payload schema lacks; add the ones the templates use.
	const schema = workflow.payloadSchema as
		| { properties?: Record<string, unknown> }
		| undefined;
	if (schema?.properties) {
		const used = Object.values(emails).flatMap(({ subject, body }) =>
			[...`${subject}${body}`.matchAll(/payload\.(\w+)/g)].map((m) => m[1]),
		);
		for (const field of used) schema.properties[field] ??= { type: "string" };
	}
	const changed = workflow.steps.filter((s) => s.type === "email").map((s) => s.stepId);
	console.log(`${workflow.workflowId}: email steps ${changed.join(", ")}`);
	if (dry) return;

	await api("PUT", `/v2/workflows/${workflow.workflowId}`, {
		name: workflow.name,
		description: workflow.description,
		tags: workflow.tags,
		active: workflow.active,
		preferences: workflow.preferences,
		payloadSchema: workflow.payloadSchema,
		validatePayload: workflow.validatePayload,
		origin: workflow.origin,
		steps,
	});
}

async function create(workflowId: string, email: { subject: string; body: string }) {
	console.log(`${workflowId}: missing in Novu, creating email + in-app steps`);
	if (dry) return;
	await api("POST", "/v2/workflows", {
		name: workflowId,
		workflowId,
		active: true,
		steps: [
			{
				name: "In-App Step",
				type: "in_app",
				controlValues: {
					subject: email.subject,
					body: "{{ payload.memberName }} won’t be joining {{ payload.projectName }} as {{ payload.position }}.",
					redirect: {
						url: "/user/project/{{ payload.projectSlug }}/team",
						target: "_self",
					},
				},
			},
			{
				name: "Email Step",
				type: "email",
				controlValues: { subject: email.subject, body: email.body, editorType: "html", layoutId: null },
			},
		],
	});
}

async function promoteAll() {
	const envs = await api<{ _id: string; name: string }[]>("GET", "/v1/environments");
	const production = envs.find((e) => e.name === "Production");
	if (!production) throw new Error("No Production environment");
	for (const id of Object.keys(NOVU_EMAILS)) {
		console.log(`promote ${id} → Production`);
		if (!dry) {
			await api("PUT", `/v2/workflows/${id}/sync`, { targetEnvironmentId: production._id });
		}
	}
}

if (promote) {
	await promoteAll();
} else {
	for (const [id, emails] of Object.entries(NOVU_EMAILS)) {
		const workflow = await getWorkflow(id);
		if (workflow) await update(workflow, emails);
		else if (id === "invitation-declined") await create(id, emails["*"]);
		else throw new Error(`${id} is not in Novu`);
	}
}
console.log(dry ? "dry run, nothing written" : "done");
