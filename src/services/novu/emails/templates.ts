import { emailHtml, v } from "./layout";

/**
 * The email step of every Novu workflow the app triggers (Pencil 13.05–13.09).
 * `bun run novu:emails` writes these into Novu; the in-app and push steps stay
 * as they are in the dashboard.
 */

export type EmailStep = { subject: string; body: string };

const ACCOUNT_REASON =
	"You’re getting this because you have an account at gdhub.io.";
const INVITER_REASON = `You’re getting this because you invited ${v("memberName")} to ${v("projectName")}.`;
const TEAM_URL =
	"{{ payload.appUrl }}/user/project/{{ payload.projectSlug }}/team";

const invitationResponse = (
	subject: string,
	heading: string,
	text: string,
	label: string,
): EmailStep => ({
	subject,
	body: emailHtml({
		heading,
		paragraphs: [text],
		button: { label, href: TEAM_URL },
		reason: INVITER_REASON,
	}),
});

const defaultMessage = (withButton: boolean): EmailStep => ({
	subject: "{{ payload.title | strip_html }}",
	body: emailHtml({
		heading: v("title"),
		paragraphs: ["{{ payload.message | strip_html | escape | newline_to_br }}"],
		button: withButton
			? {
					label: `{{ payload.buttonText | default: 'Open' | strip_html | escape }}`,
					href: "{{ payload.redirectUrl }}",
				}
			: undefined,
		reason: ACCOUNT_REASON,
	}),
});

/** Keyed by workflow id; `default-message` has one step with a link and one without. */
export const NOVU_EMAILS: Record<string, Record<string, EmailStep>> = {
	"team-invitation": {
		"*": {
			subject:
				"{{ payload.inviterName | strip_html }} invited you to {{ payload.projectName | strip_html }}",
			body: emailHtml({
				heading: `${v("inviterName")} invited you to ${v("projectName")}`,
				paragraphs: [
					`You’re invited to the ${v("teamName")} team. See the details and answer the invitation on GDHub.`,
				],
				facts: [
					["Project", v("projectName")],
					["Team", v("teamName")],
					["Position", v("position")],
					["Start date", `{{ payload.startedAt | date: '%-d %B %Y' }}`],
				],
				button: { label: "View invitation", href: "{{ payload.acceptUrl }}" },
				reason:
					"You’re getting this because someone invited you to a project team at gdhub.io.",
			}),
		},
	},
	"invitation-accepted": {
		"*": invitationResponse(
			"{{ payload.memberName | strip_html }} accepted your invitation",
			`${v("memberName")} accepted your invitation`,
			`${v("memberName")} joins ${v("projectName")} as ${v("position")}.`,
			"Open team",
		),
	},
	"invitation-accepted-pending": {
		"*": invitationResponse(
			"{{ payload.memberName | strip_html }} is waiting for your approval",
			`${v("memberName")} is waiting for your approval`,
			`${v("memberName")} accepted the invitation to ${v("projectName")} as ${v("position")}. Review it to add them to the team.`,
			"Review",
		),
	},
	"invitation-completed": {
		"*": invitationResponse(
			"{{ payload.memberName | strip_html }} joined {{ payload.projectName | strip_html }}",
			`${v("memberName")} joined ${v("projectName")}`,
			`${v("memberName")} is now on the team as ${v("position")}.`,
			"Open team",
		),
	},
	"invitation-declined": {
		"*": invitationResponse(
			"{{ payload.memberName | strip_html }} declined your invitation",
			`${v("memberName")} declined your invitation`,
			`${v("memberName")} won’t be joining ${v("projectName")} as ${v("position")}. The position stays open.`,
			"Open team",
		),
	},
	"default-message": {
		"email-step": defaultMessage(true),
		"email-step-2rb4": defaultMessage(false),
	},
	"event-member-registered": {
		"*": {
			subject: "You’re registered for {{ payload.eventTitle | strip_html }}",
			body: emailHtml({
				heading: `You’re registered for ${v("eventTitle")}`,
				paragraphs: [
					"The schedule and everything else about the event are on its page.",
				],
				button: { label: "Open event", href: "{{ payload.eventLink }}" },
				reason: `You’re getting this because you registered for ${v("eventTitle")}.`,
			}),
		},
	},
	"event-owner-new-member": {
		"*": {
			subject:
				"{{ payload.memberName | strip_html }} registered for {{ payload.eventTitle | strip_html }}",
			body: emailHtml({
				heading: `${v("memberName")} registered for ${v("eventTitle")}`,
				paragraphs: [
					"Your event has a new member. See who else is coming on the event’s page.",
				],
				button: {
					label: "Open event",
					href: "{{ payload.appUrl }}/user/event/{{ payload.eventId }}/members",
				},
				reason: `You’re getting this because you organise ${v("eventTitle")}.`,
			}),
		},
	},
	"event-member-message": {
		"*": {
			subject: "Message from {{ payload.eventTitle | strip_html }}",
			body: emailHtml({
				heading: `Message from ${v("eventTitle")}`,
				paragraphs: [
					`${v("senderName")}, the organiser, wrote to everyone registered.`,
				],
				quote: {
					by: `${v("senderName")} · organiser`,
					text: "{{ payload.message | strip_html | escape | newline_to_br }}",
				},
				button: { label: "Open event", href: "{{ payload.eventUrl }}" },
				reason: `You’re getting this because you registered for ${v("eventTitle")}.`,
			}),
		},
	},
	"share-project-news": {
		"*": {
			subject:
				"Time for a devlog post on {{ payload.projectName | strip_html }}",
			body: emailHtml({
				heading: `Time for a devlog post on ${v("projectName")}`,
				paragraphs: [
					"A short update keeps your team and followers in the loop. What changed since the last one?",
				],
				button: {
					label: "Write a devlog post",
					href: "{{ payload.addDevlogPostUrl }}",
				},
				reason: `You’re getting this because you lead ${v("projectName")} and devlog reminders are on.`,
			}),
		},
	},
};
