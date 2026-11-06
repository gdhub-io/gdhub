import { neutral } from "@/config/design/tokens";
import { hubLegalEntity } from "@/config/legal/entities";

/**
 * The GDHub email layout (Pencil 13.01) as HTML for Novu's email steps.
 * Email clients know no CSS variables or web fonts, so tokens are inlined as
 * literals. `{{ … }}` is Liquid that Novu fills from the trigger payload.
 */

const FONT =
	"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const C = {
	page: neutral[50],
	surface: neutral[0],
	border: neutral[100],
	text: neutral[900],
	secondary: neutral[500],
	action: neutral[900],
	onAction: neutral[0],
};

const APP = "{{ payload.appUrl }}";

/** A payload value as plain text: tags dropped, the rest escaped. */
export const v = (path: string) =>
	`{{ payload.${path} | strip_html | escape }}`;

const SOCIALS = [
	["telegram", "Telegram", "https://t.me/gdhub_en"],
	["discord", "Discord", "https://discord.gg/WcUFD3tHqg"],
	[
		"linkedin",
		"LinkedIn",
		"https://www.linkedin.com/company/game-developers-hub",
	],
] as const;

export type EmailParts = {
	heading: string;
	/** Paragraphs of HTML; payload values go in through `v()`. */
	paragraphs: string[];
	facts?: [label: string, value: string][];
	quote?: { by: string; text: string };
	button?: { label: string; href: string };
	reason: string;
};

const paragraph = (html: string) =>
	`<p style="margin:0 0 12px;font-size:16px;line-height:24px;">${html}</p>`;

const facts = (rows: [string, string][]) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${C.border};border-radius:12px;margin:20px 0 0;">
<tr><td style="padding:16px 24px;">
${rows
	.map(
		([label, value]) =>
			`<div style="padding:4px 0;font-size:14px;line-height:20px;"><span style="color:${C.secondary};display:inline-block;min-width:96px;">${label}</span> ${value}</div>`,
	)
	.join("\n")}
</td></tr></table>`;

const quote = ({ by, text }: { by: string; text: string }) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${C.border};border-radius:12px;margin:20px 0 0;">
<tr><td style="padding:24px;">
<div style="font-size:13px;line-height:20px;color:${C.secondary};padding-bottom:8px;">${by}</div>
<div style="font-size:16px;line-height:24px;">${text}</div>
</td></tr></table>`;

const button = ({ label, href }: { label: string; href: string }) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="gd-button" style="margin-top:32px;"><tr><td align="center" height="48" style="height:48px;border-radius:10px;background:${C.action};">
<a href="${href}" style="display:inline-block;padding:0 24px;line-height:48px;font-size:16px;font-weight:500;color:${C.onAction};text-decoration:none;">${label}</a>
</td></tr></table>`;

const footer = (reason: string) => {
	const { address } = hubLegalEntity();
	const icons = SOCIALS.map(
		([file, alt, href]) =>
			`<a href="${href}" style="text-decoration:none;"><img src="${APP}/images/email/${file}.png" width="20" height="20" alt="${alt}" style="border:0;"></a>`,
	).join('<span style="display:inline-block;width:16px;"></span>');
	return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding:32px 0 16px;">${icons}</td></tr>
<tr><td align="center" style="font-family:${FONT};font-size:13px;line-height:21px;color:${C.secondary};">
${reason}<br>
Founder gdhub.io<br>
${address}
</td></tr></table>`;
};

export function emailHtml(parts: EmailParts): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<style type="text/css">
@media only screen and (max-width: 620px) {
	.gd-outer { padding: 24px 16px 32px !important; }
	.gd-card { padding: 24px !important; }
	.gd-logo { padding-left: 24px !important; }
	.gd-heading { font-size: 20px !important; line-height: 26px !important; }
	.gd-button { width: 100% !important; }
}
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
<tr><td align="center" class="gd-outer" style="padding:40px 16px 48px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td class="gd-logo" style="padding:0 0 24px 48px;">
<a href="${APP}"><img src="${APP}/images/email/logo.png" width="115" height="31" alt="GDHub" style="display:block;border:0;"></a>
</td></tr>
<tr><td class="gd-card" style="background:${C.surface};border:1px solid ${C.border};border-radius:16px;padding:48px;font-family:${FONT};color:${C.text};">
<div class="gd-heading" style="font-size:24px;line-height:30px;font-weight:600;padding-bottom:20px;">${parts.heading}</div>
${parts.paragraphs.map(paragraph).join("\n")}
${parts.facts ? facts(parts.facts) : ""}
${parts.quote ? quote(parts.quote) : ""}
${parts.button ? button(parts.button) : ""}
</td></tr>
<tr><td>${footer(parts.reason)}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
