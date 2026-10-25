/**
 * The one project every situation is about, so they read as one checkpoint at
 * different moments: Hollow Tide, a small team building its first island.
 */

export const GOAL = "A playable vertical slice of the first island";

export const STAGE = {
	name: "Prototype",
	requirements: ["Playable prototype", "Art direction", "First playtest"],
};

export const PICTURE = `Stage: Prototype. A rough build that proves the core loop is fun.
To move on to "Vertical slice", only this has to be done on this stage:
- [ ] Playable prototype
- [ ] Art direction
- [ ] First playtest
Suggested on this stage, not required — they never hold it:
- [ ] Press kit

Team: 3 members.
- Marta (Game designer, founder) · 20–25 h/week
- Tom (Artist) · 10–15 h/week
- Ivo (Programmer) · did not say

Activity:
2026-10-05 · Marta added "Greybox build"
2026-10-12 · Tom posted a devlog
2026-10-19 · Ivo posted a devlog`;

export const DEVLOGS = {
	greybox:
		"Week 1: greybox of the island is in. You can walk from the beach to the lighthouse, the tide rises every two minutes and floods the lower paths. Build is on itch.io.",
	styleBoard:
		"Week 3: the art style board is in Figma — palette, two hero sheets and a fog study. The board is private for now; the link is on the task.",
	playtest:
		"Week 4: playtest on Saturday. Three friends played for 20 minutes each; two got stuck at the flooded bridge. Notes are in the doc.",
};

export const OUTCOMES = {
	demo: { id: "o1", text: "Playable island demo on itch.io" },
	board: { id: "o2", text: "Art style board: palette and two hero sheets" },
	playtest: { id: "o3", text: "Playtest with 5 players, notes written up" },
};
