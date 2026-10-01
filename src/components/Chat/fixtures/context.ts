import type { RoomContext } from "../ChatContextLine/kinds";

export const adviceContext: RoomContext = {
	type: "advice-request",
	canClose: true,
	data: {
		topic: "How do we price a premium DLC for a 12k-wishlist game?",
		comment:
			"The publisher pushes for a season pass instead of one paid DLC. Our wishlist is 12k with 60% from one streamer spike.",
		status: "Created",
		finishedAt: null,
		project: { name: "Hollow Tide" },
	},
};

export const vacancyContext: RoomContext = {
	type: "vacancy-application",
	canClose: true,
	data: {
		status: "Open",
		finishedAt: null,
		appliedAt: "2026-09-01T09:00:00.000Z",
		vacancy: { id: "vacancy-1", title: "Unity Gameplay Programmer" },
		project: { name: "Nebula Drift" },
		offerMessage:
			"Hi! We liked your jam entry — would you talk to us about the gameplay role?",
	},
};

export const closedAdviceContext: RoomContext = {
	...adviceContext,
	data: {
		...adviceContext.data,
		status: "Closed",
		finishedAt: "2026-09-18T10:00:00.000Z",
	},
};
