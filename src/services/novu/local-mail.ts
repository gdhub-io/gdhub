import { createTransport } from "nodemailer";
import type { NovuSendArgs } from "./index";

/**
 * Development only: a Novu trigger written as a plain email to the local
 * MailHog (`EMAIL_SERVER`), the same way the sign-in email goes in dev. It shows
 * what was sent and to whom — the workflow, the payload and its links — not the
 * template's layout, which lives in Novu.
 */
export const sendsLocally = () =>
	process.env.NODE_ENV !== "production" &&
	process.env.NOVU_LOCAL_MAIL === "1" &&
	!!process.env.EMAIL_SERVER;

const URL_PATTERN = /^https?:\/\/\S+$/;

const escapeHtml = (text: string) =>
	text.replace(
		/[&<>"]/g,
		(char) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char,
	);

export function renderLocalMail({ to, payload, template }: NovuSendArgs) {
	const rows = Object.entries(payload).map(([key, value]) => {
		const text =
			typeof value === "string" ? value : JSON.stringify(value, null, 2);
		const cell = URL_PATTERN.test(text)
			? `<a href="${escapeHtml(text)}">${escapeHtml(text)}</a>`
			: `<pre style="margin:0;white-space:pre-wrap">${escapeHtml(text)}</pre>`;
		return `<tr><td style="padding:4px 12px 4px 0;vertical-align:top"><b>${escapeHtml(key)}</b></td><td style="padding:4px 0">${cell}</td></tr>`;
	});

	return {
		to: to.email ?? to.subscriberId,
		subject: `[Novu · ${template}] to ${to.subscriberId}`,
		text: `${template}\n\n${JSON.stringify(payload, null, 2)}`,
		html: `<p>Novu workflow <b>${escapeHtml(template)}</b>, subscriber <code>${escapeHtml(to.subscriberId)}</code></p><table>${rows.join("")}</table>`,
	};
}

export async function sendLocalMail(args: NovuSendArgs) {
	const transport = createTransport(process.env.EMAIL_SERVER);
	await transport.sendMail({
		from: process.env.EMAIL_FROM || "novu@gdhub.local",
		...renderLocalMail(args),
	});
}
