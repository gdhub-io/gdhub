/**
 * Event fixtures for Storybook. Shapes mirror what the event page passes to the
 * view components; they are cast to the Prisma-derived props inside the stories.
 */

import {
	MARKDOWN_INLINE_HTML,
	MARKDOWN_SHORT,
	MARKDOWN_SHOWCASE,
} from "./markdown";

const speaker = (
	name: string,
	summary: string,
	image: string,
): Record<string, unknown> => ({
	id: `spk-${name.toLowerCase().replace(/\s+/g, "-")}`,
	name,
	summary,
	user: { name, image, profile: { name } },
});

export const mockEventSchedule: Record<string, unknown>[] = [
	{
		id: "itm-1",
		title: "Opening keynote: what indie teams got wrong in 2026",
		description: MARKDOWN_INLINE_HTML,
		startDate: "2026-09-12T10:00:00.000Z",
		endDate: "2026-09-12T11:00:00.000Z",
		url: "https://gdhub.io/events/keynote",
		speakers: [
			speaker(
				"Dima Ivanou",
				"Studio lead, Mythscape",
				"/images/team/team-member-1.png",
			),
			speaker(
				"Kate Shtirts",
				"Narrative designer",
				"/images/team/team-member-2.png",
			),
		],
	},
	{
		id: "itm-2",
		title: "Workshop: shipping a vertical slice in eight weeks",
		description: MARKDOWN_SHORT,
		startDate: "2026-09-12T11:30:00.000Z",
		endDate: "2026-09-12T13:00:00.000Z",
		speakers: [
			speaker(
				"Max Kirkitcky",
				"Technical director",
				"/images/team/team-member-3.png",
			),
			speaker("Olga Khaladovich", "Producer", "/images/team/team-member-4.png"),
			speaker(
				"Nik Evtihiev",
				"Gameplay engineer",
				"/images/team/team-member-5.png",
			),
			speaker("Vitaly Moroz", "QA lead", "/images/team/team-member-6.png"),
		],
	},
	{
		id: "itm-3",
		title: "Playtest lounge",
		description: null,
		startDate: "2026-09-12T14:00:00.000Z",
		endDate: "2026-09-12T18:00:00.000Z",
		speakers: [],
	},
];

export const mockEvent: Record<string, unknown> = {
	id: "evt-1",
	type: "MEETUP",
	title: "GDHub Meetup #12",
	shortDescription: "One day, three tracks, a room full of indie teams.",
	// `content` (Editor.js JSON) takes priority over `description`; keep it empty
	// so the markdown branch is what the story renders.
	content: null,
	description: MARKDOWN_SHOWCASE,
	image: "/images/events-empty.png",
	url: "https://gdhub.io/events/meetup-12",
	isFree: true,
	schedule: mockEventSchedule,
};

export const mockWorkDirections: Record<string, unknown>[] = [
	{ id: "wd-1", name: "development", color: "#4f8cff" },
	{ id: "wd-2", name: "game design", color: "#ff9f43" },
];
