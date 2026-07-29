/**
 * Project and vacancy fixtures for Storybook. Shapes mirror what the public
 * pages receive from the server; stories cast them to the Prisma-derived props.
 */

import { MARKDOWN_SHOWCASE } from "./markdown";

export const mockProject: Record<string, unknown> = {
	id: "prj-1",
	name: "Mythscape",
	slug: "mythscape",
	description: MARKDOWN_SHOWCASE,
	coverImage: "/images/new-project.png",
	videoLink: null,
	genre: "Turn-based tactics",
	setting: "Dark fantasy",
	platform: "PC, Steam Deck",
	visualStyle: "Hand-painted 2D",
	audition: "Players who like slow, deliberate combat",
	status: "IN_PROGRESS",
	links: [
		{ type: "website", url: "https://gdhub.io" },
		{ type: "discord", url: "https://discord.gg/gdhub" },
	],
	createdAt: "2026-01-12T10:00:00.000Z",
	updatedAt: "2026-07-20T10:00:00.000Z",
	startedAt: "2026-02-01T10:00:00.000Z",
	finishedAt: null,
	archivedAt: null,
	killedWithDignityAt: null,
	dormantAt: null,
	statusChangedAt: "2026-02-01T10:00:00.000Z",
	author: {
		name: "Dima Ivanou",
		image: "/images/team/team-member-1.png",
		profile: { name: "Dima Ivanou", tgNickname: "dima_ivanou" },
	},
	workflow: { currentStep: { name: "Vertical slice" } },
	team: { id: "team-1" },
};

export const mockVacancy: Record<string, unknown> = {
	id: "vac-1",
	title: "Unity Gameplay Programmer",
	subtitle: "Combat systems, 20h/week",
	description:
		"You will own the combat prototype: turn resolution, ability system and enemy AI hooks.",
	remote: true,
	finishedAt: "2026-09-02T00:00:00.000Z",
	offeredAmount: null,
	offeredRateType: null,
	promisePercentage: 5,
	promiseStep: { name: "Vertical slice" },
	myTeamMemberId: undefined,
	team: { project: mockProject },
};
