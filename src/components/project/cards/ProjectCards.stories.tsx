import type { Meta, StoryObj } from "@storybook/nextjs";
import { ProjectCard } from "./ProjectCard";
import { ProjectStoreCard } from "./ProjectStoreCard";

const team = {
	count: 4,
	members: [
		{ name: "Olga Marchenko", image: null },
		{ name: "Sam Reed", image: null },
		{ name: "Lena Novak", image: null },
	],
};

const meta: Meta = {
	title: "Components/Project cards",
	parameters: { layout: "padded" },
};

export default meta;

/** The grid card: a quarter of a row, cover on top, foot on paper. */
export const Standard: StoryObj = {
	render: () => (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
				gap: 16,
				maxWidth: 1180,
			}}
		>
			<ProjectCard
				projectId="p1"
				slug="echo-vale"
				name="Echo Vale: Tides of the Deep"
				genre="RPG"
				platform="PC / Steam"
				stage="Production"
				description="A tidal-shift RPG where every low tide opens a village you could not reach yesterday."
				hasOpenPositions
				applauseCount={24}
				team={team}
				authorName="Anna Kovalenko"
			/>
			<ProjectCard
				projectId="p2"
				slug="night-harbor"
				name="Night Harbor — Director's Cut"
				genre="Adventure"
				platform="PC / Switch"
				stage="Production"
				description="A harbour town sim where the tide takes a building back each night and you choose what gets rebuilt."
				applauseCount={1284}
				team={{ count: 7, members: team.members }}
				authorName="Me"
			/>
			<ProjectCard
				projectId="p3"
				slug="rogue-lane"
				name="Rogue Lane"
				genre="Roguelite"
				platform="PC / Steam"
				stage="Prototype"
				description="A one-street roguelite: every run rewrites the shops, the neighbours and who is willing to open a door."
				hasOpenPositions
				applauseCount={3}
				team={{ count: 3, members: team.members.slice(0, 2) }}
				authorName="Marty Spencer"
			/>
			{/* Everything optional missing — the card must not collapse. */}
			<ProjectCard projectId="p4" slug="untitled" name="Untitled project" />
		</div>
	),
};

/** The shipped card: half a row, taller cover, storefronts on the artwork. */
export const OnStores: StoryObj = {
	render: () => (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
				gap: 16,
				maxWidth: 1180,
			}}
		>
			<ProjectStoreCard
				projectId="s1"
				slug="starbound-saga"
				name="Starbound Saga: Salvage of the Ninth Fleet"
				genre="Sci-fi roguelite"
				platform="PC / Steam Deck"
				stage="Release"
				description="A hand-drawn space opera about salvaging what the fleet left behind — every hull you strip becomes a room, a weapon, or somebody's grave marker."
				applauseCount={128}
				storeLinks={[
					{ platform: "steam", link: "#", isPrimary: true },
					{ platform: "itch-io", link: "#", isPrimary: false },
				]}
				team={{ count: 9, members: team.members }}
				authorName="Marty Spencer"
			/>
			<ProjectStoreCard
				projectId="s2"
				slug="chilled-serenity"
				name="Chilled Serenity"
				genre="Cozy builder"
				platform="PC / Mac"
				stage="Release"
				description="A slow forest builder with no fail state and a very patient soundtrack — plant, wait, and let the woods decide the pace."
				applauseCount={12}
				storeLinks={[{ platform: "steam", link: "#", isPrimary: true }]}
				team={{ count: 4, members: team.members.slice(0, 1) }}
				authorName="Anna Kovalenko"
			/>
		</div>
	),
};
