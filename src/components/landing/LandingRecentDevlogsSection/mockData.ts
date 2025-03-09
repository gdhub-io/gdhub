import { DevlogPost } from './types'

export const mockDevlogs: DevlogPost[] = [
	{
		id: '1',
		content:
			"# Major Update Released!\n\nWe're excited to announce that we've just released a major update to our game. This update includes new levels, characters, and gameplay mechanics. We've also fixed several bugs and improved performance.\n\n## New Features\n\n- 5 new levels in the Forest world\n- 2 new playable characters with unique abilities\n- New weapon system with customizable upgrades\n- Improved AI for enemy NPCs",
		publishedAt: '2023-11-15T10:30:00Z',
		authorId: 'author1',
		projectId: 'project1',
		author: {
			name: 'Alex Petrov',
			image: 'https://randomuser.me/api/portraits/men/32.jpg',
		},
		project: {
			name: 'Cosmic Explorers',
			slug: 'cosmic-explorers',
			description: 'A space exploration adventure game with procedurally generated worlds',
		},
	},
	{
		id: '2',
		content:
			"## Art Direction Update\n\nThis week our art team has been working on finalizing the visual style for the desert biome. We've created several new environment assets and character skins that match the harsh desert aesthetic.\n\n![Desert Concept Art](https://example.com/desert-concept.jpg)\n\nWe've also been experimenting with new lighting techniques to create a more immersive atmosphere during the day/night cycle.",
		publishedAt: '2023-11-10T14:45:00Z',
		authorId: 'author2',
		projectId: 'project2',
		author: {
			name: 'Maria Ivanova',
			image: 'https://randomuser.me/api/portraits/women/44.jpg',
		},
		project: {
			name: 'Shadow Realms',
			slug: 'shadow-realms',
			description: 'A dark fantasy RPG with a unique combat system and branching storylines',
		},
	},
	{
		id: '3',
		content:
			"We've been working on optimizing our game engine to improve performance on lower-end devices. Our latest benchmarks show a 30% improvement in frame rate on mobile devices and a 15% reduction in memory usage.\n\n```\n// New optimization for particle systems\nfunction optimizeParticles(count) {\n  return Math.min(count, MAX_PARTICLES_PER_SYSTEM);\n}\n```\n\nNext week we'll be focusing on further optimizing asset loading times.",
		publishedAt: '2023-11-05T09:15:00Z',
		authorId: 'author3',
		projectId: 'project3',
		author: {
			name: 'Dmitry Sokolov',
			image: 'https://randomuser.me/api/portraits/men/67.jpg',
		},
		project: {
			name: 'Velocity Rush',
			slug: 'velocity-rush',
			description: 'A high-speed racing game with futuristic vehicles and dynamic tracks',
		},
	},
]
