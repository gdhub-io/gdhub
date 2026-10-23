/** Where the site's contact forms deliver, and the sender they come from. */
export const CONTACT_EMAIL = "info@gdhub.io";

export const ContactTopic = {
	General: "General",
	ScoutSpace: "ScoutSpace",
} as const;
export type ContactTopic = (typeof ContactTopic)[keyof typeof ContactTopic];
