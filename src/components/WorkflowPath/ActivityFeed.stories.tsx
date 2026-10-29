import type { Meta, StoryObj } from "@storybook/nextjs";
import axios, { type AxiosAdapter } from "axios";
import { useEffect, useState } from "react";
import type {
	ProjectActivity,
	ProjectActivityKind,
} from "@/repositories/project/activity";
import type { CheckpointSprintDto } from "@/types/checkpoints";
import { ActivityFeed } from "./ActivityFeed";

const day = (offset: number, hour = 11) => {
	const date = new Date();
	date.setUTCHours(hour, 20, 0, 0);
	date.setUTCDate(date.getUTCDate() + offset);
	return date.toISOString();
};

const KINDS: [ProjectActivityKind, string | null, string | null][] = [
	["devlog", "Anna Volkova", "#12"],
	["artifact", "Leo Park", "Build 0.3"],
	["joined", "Olga Petrova", "Sound designer"],
	["vacancyOpened", null, "Level designer"],
	["reworded", null, "Greybox build on itch.io"],
	["left", "Nick Lowe", "3D artist"],
	["vacancyClosed", null, "Concept artist"],
	["stage", null, "Concepting"],
];

/** Sixty events, two a day going back a month — enough to scroll through pages. */
const HISTORY: ProjectActivity[] = Array.from({ length: 60 }, (_, index) => {
	const [kind, actor, subject] = KINDS[index % KINDS.length];
	return {
		id: `e${index}`,
		at: day(-Math.floor(index / 2), index % 2 ? 9 : 15),
		kind,
		actor,
		subject,
	};
});

const sprints: CheckpointSprintDto[] = [1, 2, 3, 4].map((number) => ({
	number,
	from: day(-22 + (number - 1) * 7, 0),
	to: day(-22 + number * 7 - 1, 0),
	firstDay: (number - 1) * 7 + 1,
	lastDay: number * 7,
	devlogDay: number * 7,
	state: number === 4 ? "current" : "done",
}));

/** Answers the activity endpoint from `HISTORY`, a little slowly, like a server. */
const fakeActivity =
	(events: ProjectActivity[]): AxiosAdapter =>
	async (config) => {
		const { before, limit = 20 } = config.params ?? {};
		const page = events
			.filter((row) => !before || row.at < before)
			.slice(0, Number(limit));
		await new Promise((resolve) => setTimeout(resolve, 600));
		return {
			data: {
				events: page,
				next: page.length === Number(limit) ? (page.at(-1)?.at ?? null) : null,
			},
			status: 200,
			statusText: "OK",
			headers: {},
			config,
		};
	};

/** Swaps axios's adapter for the story's life, so the feed's requests are answered. */
function WithActivity({
	events,
	projectId,
}: {
	events: ProjectActivity[];
	projectId: string;
}) {
	const [ready, setReady] = useState(false);
	useEffect(() => {
		const previous = axios.defaults.adapter;
		axios.defaults.adapter = fakeActivity(events);
		setReady(true);
		return () => {
			axios.defaults.adapter = previous;
		};
	}, [events]);

	return ready ? (
		<div style={{ maxWidth: 320 }}>
			<ActivityFeed source={{ projectId }} sprints={sprints} />
		</div>
	) : null;
}

const meta: Meta = {
	title: "Workflow/Activity",
	parameters: { layout: "padded" },
};

export default meta;

/** Scroll to the bottom of the list: the next twenty load, three pages in all. */
export const LongHistory: StoryObj = {
	render: () => <WithActivity events={HISTORY} projectId="story-long" />,
};

export const Empty: StoryObj = {
	render: () => <WithActivity events={[]} projectId="story-empty" />,
};
