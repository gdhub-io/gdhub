import { hubLegalEntity } from "@/config/legal/entities";

/** Where the site's contact forms deliver, and the sender they come from. */
export const CONTACT_EMAIL = hubLegalEntity().infoEmail;

export const ContactTopic = {
	General: "General",
	ScoutSpace: "ScoutSpace",
} as const;
export type ContactTopic = (typeof ContactTopic)[keyof typeof ContactTopic];
