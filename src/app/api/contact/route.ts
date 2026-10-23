import { createTransport } from "nodemailer";
import { z } from "zod";
import { CONTACT_EMAIL, ContactTopic } from "@/config/contact";
import { WaitlistFeature } from "@/config/prisma-enums";
import { clientIp } from "@/helpers/request";
import { apiError, json, withAuth, withValidation } from "@/lib/api-handlers";
import { limitAiCalls } from "@/lib/rate-limit";
import { joinWaitlist } from "@/repositories/feature-waitlist";
import { brevoApi } from "@/services/brevo";

const ContactSchema = z.object({
	email: z.string().trim().email().max(254),
	subject: z.string().trim().min(1).max(200),
	message: z.string().trim().min(1).max(5000),
	topic: z.nativeEnum(ContactTopic).default(ContactTopic.General),
});

const escapeHtml = (text: string) =>
	text.replace(
		/[&<>"']/g,
		(char) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				char
			] ?? char,
	);

type Letter = { replyTo: string; subject: string; html: string };

/** Brevo in production; in development the local mail catcher (`EMAIL_SERVER`), as sign-in does. */
async function deliver({ replyTo, subject, html }: Letter) {
	if (process.env.NODE_ENV !== "production" && process.env.EMAIL_SERVER) {
		await createTransport(process.env.EMAIL_SERVER).sendMail({
			from: CONTACT_EMAIL,
			to: CONTACT_EMAIL,
			replyTo,
			subject,
			html,
		});
		return true;
	}

	const sent = await brevoApi.smtp.sendTransacEmail({
		sender: { email: CONTACT_EMAIL, name: "GDHub website" },
		to: [{ email: CONTACT_EMAIL }],
		replyTo: { email: replyTo },
		subject,
		htmlContent: html,
	});
	if (sent.error) console.error("contact form", sent.error);
	return !sent.error;
}

/**
 * The landing's "Write to us" and "Request access to Scout space" forms: a
 * letter to the team, answered by replying to the sender. A Scout request also
 * puts the sender on the Scout space waitlist.
 */
export const POST = withAuth({ mode: "any" })(
	withValidation(
		ContactSchema,
		"body",
	)(async (req, _ctx, { body }) => {
		const limited = await limitAiCalls("contact", clientIp(req) || "unknown");
		if (limited) return limited;

		const { email, subject, message, topic } = body as z.infer<
			typeof ContactSchema
		>;

		if (topic === ContactTopic.ScoutSpace) {
			await joinWaitlist(WaitlistFeature.ScoutSpace, email);
		}

		const sent = await deliver({
			replyTo: email,
			subject: `[${topic}] ${subject}`,
			html: `<p><b>From:</b> ${escapeHtml(email)}</p><p>${escapeHtml(
				message,
			).replace(/\n/g, "<br>")}</p>`,
		});
		if (!sent) return apiError.internal();

		return json({ sent: true });
	}),
);
