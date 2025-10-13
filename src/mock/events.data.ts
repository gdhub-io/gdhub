export type EventType =
	| "MEETUP"
	| "GAMEJAM"
	| "WORKSHOP"
	| "GAMELAB"
	| "CONFERENCE";
export type EventStatus = "upcoming" | "ongoing" | "past";
export type Event = {
	id: string;
	title: string;
	type: EventType;
	description: string;
	startDate: string; // ISO
	endDate: string; // ISO
	importance: number; // 1-5
	image: string; // url
	isFree: boolean; // true — free, false — paid
};

export const mockEvents: Event[] = [
	{
		id: "1",
		title: "Summer GameLab",
		type: "GAMELAB",
		description:
			"Start your own game project in 3 months! Work with mentors and team.",
		startDate: "2025-06-01",
		endDate: "2025-08-31",
		importance: 5,
		image:
			"https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
		isFree: false,
	},
	{
		id: "2",
		title: "Indie GameJam",
		type: "GAMEJAM",
		description: "Try your ideas in 48 hours! Team up and create a prototype.",
		startDate: "2025-07-10",
		endDate: "2025-07-12",
		importance: 4,
		image:
			"https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80",
		isFree: true,
	},
	{
		id: "3",
		title: "Unity Workshop",
		type: "WORKSHOP",
		description: "Learn Unity basics in 2 weeks. Practice and Q&A.",
		startDate: "2025-09-10",
		endDate: "2025-09-24",
		importance: 3,
		image:
			"https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=800&q=80",
		isFree: false,
	},
	{
		id: "4",
		title: "Monthly Meetup: Game Design",
		type: "MEETUP",
		description: "Share your expertise in game design. Open discussion.",
		startDate: "2025-08-20",
		endDate: "2025-08-20",
		importance: 2,
		image:
			"https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=800&q=80",
		isFree: true,
	},
	{
		id: "5",
		title: "Summer Conference",
		type: "CONFERENCE",
		description: "Biggest event of the summer! Talks, networking, and more.",
		startDate: "2025-06-15",
		endDate: "2025-06-20",
		importance: 4,
		image:
			"https://images.unsplash.com/photo-1503676382389-4809596d5290?auto=format&fit=crop&w=800&q=80",
		isFree: false,
	},
	{
		id: "6",
		title: "Spring GameJam",
		type: "GAMEJAM",
		description: "Spring challenge for all indie teams!",
		startDate: "2025-10-10",
		endDate: "2025-10-12",
		importance: 3,
		image:
			"https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80",
		isFree: true,
	},
	{
		id: "7",
		title: "April Meetup: Level Design",
		type: "MEETUP",
		description: "Discuss the best practices in level design with peers.",
		startDate: "2025-04-10",
		endDate: "2025-04-10",
		importance: 2,
		image:
			"https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80",
		isFree: true,
	},
	{
		id: "8",
		title: "Retro GameJam",
		type: "GAMEJAM",
		description: "Create a retro-style game in 48 hours!",
		startDate: "2025-04-15",
		endDate: "2025-04-17",
		importance: 3,
		image:
			"https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80",
		isFree: false,
	},
	{
		id: "9",
		title: "Indie Meetup: Sound Design",
		type: "MEETUP",
		description:
			"Let's talk about sound in games! Tips, tricks, and networking.",
		startDate: "2025-07-25",
		endDate: "2025-07-25",
		importance: 2,
		image:
			"https://images.unsplash.com/photo-1465101178521-c1a9136a3b41?auto=format&fit=crop&w=800&q=80",
		isFree: true,
	},
	{
		id: "10",
		title: "Monthly Meetup: Narrative Design",
		type: "MEETUP",
		description: "Share your story-driven game ideas and get feedback.",
		startDate: "2025-09-05",
		endDate: "2025-09-05",
		importance: 2,
		image:
			"https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80",
		isFree: true,
	},
	{
		id: "11",
		title: "Meetup: Game Marketing",
		type: "MEETUP",
		description: "How to promote your indie game: practical cases.",
		startDate: "2025-10-01",
		endDate: "2025-10-01",
		importance: 2,
		image:
			"https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80",
		isFree: false,
	},
	{
		id: "12",
		title: "Unreal Engine Workshop",
		type: "WORKSHOP",
		description: "Dive into Unreal Engine basics and blueprints.",
		startDate: "2025-08-15",
		endDate: "2025-08-29",
		importance: 3,
		image:
			"https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=800&q=80",
		isFree: false,
	},
	{
		id: "13",
		title: "Pixel Art Workshop",
		type: "WORKSHOP",
		description: "Learn to create pixel art for your games.",
		startDate: "2025-07-20",
		endDate: "2025-07-27",
		importance: 3,
		image:
			"https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80",
		isFree: true,
	},
	{
		id: "14",
		title: "Game UI/UX Workshop",
		type: "WORKSHOP",
		description: "Best practices for game interfaces and player experience.",
		startDate: "2025-09-15",
		endDate: "2025-09-22",
		importance: 3,
		image:
			"https://images.unsplash.com/photo-1465101178521-c1a9136a3b41?auto=format&fit=crop&w=800&q=80",
		isFree: false,
	},
	{
		id: "15",
		title: "March Workshop: Game Animation",
		type: "WORKSHOP",
		description: "Animate your characters and environments.",
		startDate: "2025-03-10",
		endDate: "2025-03-17",
		importance: 2,
		image:
			"https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=800&q=80",
		isFree: false,
	},
	{
		id: "16",
		title: "February Meetup: Indie Funding",
		type: "MEETUP",
		description: "How to find funding for your indie project.",
		startDate: "2025-02-20",
		endDate: "2025-02-20",
		importance: 2,
		image:
			"https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=800&q=80",
		isFree: true,
	},
	{
		id: "17",
		title: "January GameJam",
		type: "GAMEJAM",
		description: "Start the year with a creative challenge!",
		startDate: "2025-01-15",
		endDate: "2025-01-17",
		importance: 3,
		image:
			"https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80",
		isFree: false,
	},
];
