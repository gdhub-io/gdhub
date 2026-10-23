import type { Meta, StoryObj } from "@storybook/nextjs";
import { InverseBand } from "@/components/ui/InverseBand";
import { LandingHeroSection } from "../LandingHeroSection";
import { BakeSource } from "./BakeSource";
import { HeroGame } from "./index";

const meta: Meta<typeof HeroGame> = {
	title: "Landing/HeroGame",
	component: HeroGame,
	parameters: { layout: "fullscreen" },
	// The landing is dark end to end; its layout wraps everything in this band.
	decorators: [
		(Story) => (
			<InverseBand>
				<Story />
			</InverseBand>
		),
	],
};

export default meta;

type Story = StoryObj<typeof HeroGame>;

/**
 * Cube prototype: pawns stand in for the characters. Click a team pawn
 * (coral author, blue programmer, purple artist) to select it, hover a tile to
 * see the step cost, click it to move. Amber sage, cyan robot and golden-brown scout
 * are not playable.
 */
export const Prototype: Story = {
	render: () => (
		<div style={{ height: 660, maxWidth: 624, margin: "0 auto" }}>
			<HeroGame />
		</div>
	),
};

// Empty stats keep the stats card off the board, so every tile can be clicked.
const noStats = {
	usersCount: null,
	specialitiesCount: null,
	projectsCount: null,
	vacanciesCount: null,
	investmentAmount: 0,
};

/** The landing hero with the prototype in place of the illustration. */
export const InHero: Story = {
	render: () => <LandingHeroSection stats={noStats} art={<HeroGame />} />,
};

/**
 * The island lit in real time, with a button that saves it as
 * island-source.glb for scripts/hero-game/bake-island.py. Re-run after any
 * change to the layout or the models.
 */
export const BakeSourceExport: Story = {
	name: "Bake source",
	render: () => <BakeSource />,
};
