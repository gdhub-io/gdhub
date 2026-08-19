import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/services/prisma";

vi.mock("@gdhub-io/gdhub-prisma", () => ({
	ChatRoomKind: {
		Direct: "Direct",
		AdviceRequest: "AdviceRequest",
		VacancyOffer: "VacancyOffer",
	},
	ChatRoomStatus: { Open: "Open", Closed: "Closed" },
	AdviceRequestStatus: { Closed: "Closed" },
	withAuditContext: (_context: unknown, callback: () => unknown) => callback(),
}));

vi.mock("../src/services/prisma", () => ({
	prisma: {
		chatRoom: { findUnique: vi.fn(), findMany: vi.fn() },
		teamVacancy: { findUnique: vi.fn(), findMany: vi.fn() },
		adviceRequest: { findUnique: vi.fn() },
		user: { findUnique: vi.fn(), findMany: vi.fn() },
	},
}));

vi.mock("../src/services/matrix/admin", () => ({
	getRoomMemberIds: vi.fn(),
	matrixIdToUserId: (matrixUserId: string) =>
		matrixUserId.match(/^@(.+):mx\.test$/)?.[1] ?? null,
}));

vi.mock("../src/services/novu", () => ({
	NovuService: { send: vi.fn(() => Promise.resolve()) },
}));

const sessionUser = {
	id: "candidate1",
	email: "candidate@example.com",
	name: "Candidate",
	roles: [],
	onboardingDone: true,
};

vi.mock("@/auth", () => ({
	auth: vi.fn(() => Promise.resolve({ user: sessionUser })),
}));

import { filterParticipantRooms } from "../src/services/chat/participation";
import { getRoomMemberIds } from "../src/services/matrix/admin";
import { NovuService } from "../src/services/novu";

// biome-ignore lint/suspicious/noExplicitAny: test harness
type AnyMock = any;

async function callRoute(
	handler: unknown,
	url: string,
	method: string,
	params: Record<string, string> = {},
	body?: unknown,
) {
	const { NextRequest } = await import("next/server");
	const request = new NextRequest(
		new Request(url, {
			method,
			headers: { "content-type": "application/json" },
			body: body === undefined ? undefined : JSON.stringify(body),
		}),
	);
	return (handler as AnyMock)(request, { params: Promise.resolve(params) });
}

const adviceRoom = {
	kind: "AdviceRequest" as const,
	directKey: "advice:a1",
	context: { adviceRequestId: "a1", fromUserId: "asker", toUserId: "expert" },
};
const vacancyRoom = {
	kind: "VacancyOffer" as const,
	directKey: "vacancy:v1:candidate1",
	context: { vacancyId: "v1", candidateUserId: "candidate1" },
};

beforeEach(() => {
	vi.clearAllMocks();
	(NovuService.send as AnyMock).mockResolvedValue(undefined);
	(prisma.teamVacancy.findMany as AnyMock).mockResolvedValue([]);
});

describe("filterParticipantRooms", () => {
	it("keeps the rooms the user belongs to and drops the rest", async () => {
		const rooms = [
			adviceRoom,
			vacancyRoom,
			{
				kind: "Direct" as const,
				directKey: "direct:someone:else",
				context: { userIds: ["someone", "else"] },
			},
		];

		const own = await filterParticipantRooms(rooms, "candidate1");

		expect(own).toEqual([vacancyRoom]);
	});

	it("recognises the author side of a vacancy chat", async () => {
		(prisma.teamVacancy.findMany as AnyMock).mockResolvedValue([{ id: "v1" }]);

		const own = await filterParticipantRooms([vacancyRoom], "author1");

		expect(own).toEqual([vacancyRoom]);
	});

	it("does not confuse a stranger with the vacancy's author", async () => {
		const own = await filterParticipantRooms([vacancyRoom], "stranger");

		expect(own).toEqual([]);
	});
});

describe("GET /api/chat/rooms/[id]", () => {
	it("refuses a room the caller has nothing to do with", async () => {
		(prisma.chatRoom.findUnique as AnyMock).mockResolvedValue({
			id: "room1",
			status: "Open",
			finishedAt: null,
			...adviceRoom,
		});
		(getRoomMemberIds as AnyMock).mockResolvedValue([
			"@asker:mx.test",
			"@expert:mx.test",
		]);

		const { GET } = await import("../src/app/api/chat/rooms/[id]/route");
		const res = await callRoute(GET, "http://t/api/chat/rooms/!r", "GET", {
			id: "!r:mx.test",
		});

		expect(res.status).toBe(403);
		// The advice topic and comment never even get loaded.
		expect(prisma.adviceRequest.findUnique).not.toHaveBeenCalled();
	});

	it("serves the context to a participant", async () => {
		(prisma.chatRoom.findUnique as AnyMock).mockResolvedValue({
			id: "room1",
			status: "Open",
			finishedAt: null,
			...vacancyRoom,
		});
		(prisma.teamVacancy.findUnique as AnyMock).mockResolvedValue({
			id: "v1",
			title: "Gameplay programmer",
			team: { project: { id: "p1", name: "P", slug: "p", authorId: "author1" } },
		});

		const { GET } = await import("../src/app/api/chat/rooms/[id]/route");
		const res = await callRoute(GET, "http://t/api/chat/rooms/!r", "GET", {
			id: "!r:mx.test",
		});

		expect(res.status).toBe(200);
		expect((await res.json()).type).toBe("vacancy-application");
	});

	it("lets in a room member the registry cannot recognise", async () => {
		// A project admin who is not the project's author opens a vacancy chat:
		// legitimate member, invisible to the directKey and the context.
		(prisma.chatRoom.findUnique as AnyMock).mockResolvedValue({
			id: "room1",
			status: "Open",
			finishedAt: null,
			...vacancyRoom,
			directKey: "vacancy:v1:someone-else",
			context: { vacancyId: "v1", candidateUserId: "someone-else" },
		});
		(getRoomMemberIds as AnyMock).mockResolvedValue(["@candidate1:mx.test"]);
		(prisma.teamVacancy.findUnique as AnyMock).mockResolvedValue({
			id: "v1",
			title: "Gameplay programmer",
			team: { project: { id: "p1", name: "P", slug: "p", authorId: "author1" } },
		});

		const { GET } = await import("../src/app/api/chat/rooms/[id]/route");
		const res = await callRoute(GET, "http://t/api/chat/rooms/!r", "GET", {
			id: "!r:mx.test",
		});

		expect(res.status).toBe(200);
	});

	it("leaks nothing about a room the registry does not know", async () => {
		(prisma.chatRoom.findUnique as AnyMock).mockResolvedValue(null);

		const { GET } = await import("../src/app/api/chat/rooms/[id]/route");
		const res = await callRoute(GET, "http://t/api/chat/rooms/!r", "GET", {
			id: "!r:mx.test",
		});

		expect(await res.json()).toEqual({ type: "default", data: null });
	});
});

describe("POST /api/chat/rooms/[id]/invite-response", () => {
	it("refuses to notify the members of someone else's room", async () => {
		(prisma.user.findUnique as AnyMock).mockResolvedValue({ name: "Nosy" });
		(getRoomMemberIds as AnyMock).mockResolvedValue([
			"@asker:mx.test",
			"@expert:mx.test",
		]);
		(prisma.chatRoom.findUnique as AnyMock).mockResolvedValue(adviceRoom);

		const { POST } = await import(
			"../src/app/api/chat/rooms/[id]/invite-response/route"
		);
		const res = await callRoute(
			POST,
			"http://t/api/chat/rooms/!r/invite-response",
			"POST",
			{ id: "!r:mx.test" },
			{ action: "accepted" },
		);

		expect(res.status).toBe(403);
		expect(NovuService.send).not.toHaveBeenCalled();
	});

	it("still notifies the inviter when the invitee declined and already left", async () => {
		(prisma.user.findUnique as AnyMock).mockResolvedValue({ name: "Candidate" });
		// The decline leaves the room first, so Matrix no longer lists them.
		(getRoomMemberIds as AnyMock).mockResolvedValue(["@author1:mx.test"]);
		(prisma.chatRoom.findUnique as AnyMock).mockResolvedValue(vacancyRoom);
		(prisma.user.findMany as AnyMock).mockResolvedValue([
			{ id: "author1", email: "author@example.com" },
		]);

		const { POST } = await import(
			"../src/app/api/chat/rooms/[id]/invite-response/route"
		);
		const res = await callRoute(
			POST,
			"http://t/api/chat/rooms/!r/invite-response",
			"POST",
			{ id: "!r:mx.test" },
			{ action: "declined" },
		);

		expect(res.status).toBe(200);
		expect(NovuService.send).toHaveBeenCalledTimes(1);
	});
});

describe("GET /api/chat/rooms/kinds", () => {
	it("maps only the caller's own rooms", async () => {
		(prisma.chatRoom.findMany as AnyMock).mockResolvedValue([
			{ matrixRoomId: "!mine:mx.test", ...vacancyRoom },
			{ matrixRoomId: "!theirs:mx.test", ...adviceRoom },
		]);

		const { GET } = await import("../src/app/api/chat/rooms/kinds/route");
		const res = await callRoute(
			GET,
			"http://t/api/chat/rooms/kinds?matrixRoomIds=!mine:mx.test,!theirs:mx.test",
			"GET",
		);

		expect(await res.json()).toEqual({ "!mine:mx.test": "VacancyOffer" });
	});
});
