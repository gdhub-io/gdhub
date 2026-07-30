import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/services/prisma";

vi.mock("@gdhub-io/gdhub-prisma", () => ({
	TeamMemberStatus: {
		Applicant: "Applicant",
		Hired: "Hired",
		Rejected: "Rejected",
	},
	TeamVacancyStatus: { Published: "Published", Closed: "Closed" },
	UserRole: { Admin: "Admin" },
}));

vi.mock("../src/services/prisma", () => ({
	prisma: {
		teamVacancy: { findUnique: vi.fn() },
		teamMember: { findFirst: vi.fn(), update: vi.fn() },
		user: { findUnique: vi.fn() },
		team: { findUnique: vi.fn() },
	},
}));

vi.mock("../src/services/chat/vacancy-keys", () => ({
	closeVacancyChats: vi.fn(),
	vacancyChatDirectKey: (vacancyId: string, candidateUserId: string) =>
		`vacancy:${vacancyId}:${candidateUserId}`,
}));

vi.mock("../src/services/chat/vacancy-offer", () => ({
	ensureVacancyOfferChat: vi.fn(),
}));

vi.mock("../src/services/matrix/admin", () => ({
	sendRoomMessageAs: vi.fn(),
}));

vi.mock("../src/services/novu", () => ({
	NovuService: { send: vi.fn() },
}));

const sessionUser = {
	id: "author1",
	email: "author@example.com",
	name: "Author",
	roles: ["Author"],
};

vi.mock("next-auth/next", () => ({
	getServerSession: vi.fn(() => Promise.resolve({ user: sessionUser })),
}));

vi.mock("@/auth", () => ({
	auth: vi.fn(() => Promise.resolve({ user: sessionUser })),
}));

import { closeVacancyChats } from "../src/services/chat/vacancy-keys";
import { ensureVacancyOfferChat } from "../src/services/chat/vacancy-offer";
import { sendRoomMessageAs } from "../src/services/matrix/admin";
import { NovuService } from "../src/services/novu";

async function callRoute(
	handler: unknown,
	url: string,
	method: string,
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
	// biome-ignore lint/suspicious/noExplicitAny: test harness
	return (handler as any)(request, { params: Promise.resolve({}) });
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("PUT /api/user/project/vacancy/candidate/hire", () => {
	it("closes the chat with the VACANCY id, not the TeamMember id (review regression)", async () => {
		// The route receives the TeamMember id in `id`.
		(prisma.teamVacancy.findUnique as any).mockResolvedValue(null);
		(prisma.teamMember.update as any).mockResolvedValue({
			id: "tm1",
			user: { id: "cand1", email: "cand@example.com" },
			team: { id: "t1", name: "Team" },
			vacancy: {
				id: "vac1",
				title: "Position",
				promisePercentage: null,
				promiseStepId: null,
			},
		});

		const { PUT } = await import(
			"../src/app/api/user/project/vacancy/candidate/hire/route"
		);
		const response = await callRoute(PUT, "http://test/hire", "PUT", {
			id: "tm1",
		});

		expect(response.status).toBe(200);
		// Third arg: the farewell system message posted before the room closes.
		expect(closeVacancyChats).toHaveBeenCalledWith(
			"vac1",
			"cand1",
			expect.objectContaining({
				notice: expect.objectContaining({ senderUserId: "author1" }),
			}),
		);
	});
});

describe("POST /api/chat/rooms/vacancy", () => {
	const vacancy = {
		id: "vac1",
		team: { project: { authorId: "author1" } },
	};
	const candidate = {
		id: "cand1",
		email: "cand@example.com",
		name: "Cand",
		profile: { name: "Candidate Name" },
	};

	beforeEach(() => {
		(prisma.teamVacancy.findUnique as any).mockResolvedValue(vacancy);
		(prisma.user.findUnique as any).mockResolvedValue(candidate);
		(ensureVacancyOfferChat as any).mockResolvedValue({
			chatRoomId: "cr1",
			roomId: "!room1",
			created: true,
			inviteeUserId: "cand1",
		});
	});

	async function post(body: unknown) {
		const { POST } = await import("../src/app/api/chat/rooms/vacancy/route");
		return callRoute(POST, "http://test/api/chat/rooms/vacancy", "POST", body);
	}

	it("auto-joins an ACTIVE applicant and quotes their greeting", async () => {
		(prisma.teamMember.findFirst as any).mockResolvedValue({
			id: "tm1",
			applicationMessage: "hello there",
		});

		const response = await post({
			vacancyId: "vac1",
			candidateUserId: "cand1",
		});

		expect(response.status).toBe(200);
		// Only an active application counts.
		expect(prisma.teamMember.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ status: "Applicant" }),
			}),
		);
		expect(ensureVacancyOfferChat).toHaveBeenCalledWith(
			expect.objectContaining({
				autoJoinInvitees: true,
				allowReopen: true,
				firstMessage: '💬 Candidate Name: "hello there"',
			}),
		);
		expect(NovuService.send).toHaveBeenCalledTimes(1);
	});

	it("keeps the invite screen for talent-pool outreach (no application)", async () => {
		(prisma.teamMember.findFirst as any).mockResolvedValue(null);

		await post({
			vacancyId: "vac1",
			candidateUserId: "cand1",
			message: "join us!",
		});

		expect(ensureVacancyOfferChat).toHaveBeenCalledWith(
			expect.objectContaining({
				autoJoinInvitees: false,
				allowReopen: true,
				firstMessage: "join us!",
			}),
		);
	});

	it("delivers the offer message into an EXISTING room and notifies", async () => {
		(prisma.teamMember.findFirst as any).mockResolvedValue(null);
		(ensureVacancyOfferChat as any).mockResolvedValue({
			chatRoomId: "cr1",
			roomId: "!room1",
			created: false,
			inviteeUserId: "cand1",
		});

		await post({
			vacancyId: "vac1",
			candidateUserId: "cand1",
			message: "second offer",
		});

		expect(sendRoomMessageAs).toHaveBeenCalledWith(
			"author1",
			"!room1",
			"second offer",
		);
		expect(NovuService.send).toHaveBeenCalledTimes(1);
	});

	it("a bare re-open neither reopens, messages, nor notifies", async () => {
		(prisma.teamMember.findFirst as any).mockResolvedValue(null);
		(ensureVacancyOfferChat as any).mockResolvedValue({
			chatRoomId: "cr1",
			roomId: "!room1",
			created: false,
			inviteeUserId: "cand1",
		});

		const response = await post({
			vacancyId: "vac1",
			candidateUserId: "cand1",
		});

		expect(response.status).toBe(200);
		expect(ensureVacancyOfferChat).toHaveBeenCalledWith(
			expect.objectContaining({ allowReopen: false }),
		);
		expect(sendRoomMessageAs).not.toHaveBeenCalled();
		expect(NovuService.send).not.toHaveBeenCalled();
	});

	it("rejects a caller who is not the project author", async () => {
		(prisma.teamVacancy.findUnique as any).mockResolvedValue({
			id: "vac1",
			team: { project: { authorId: "someone-else" } },
		});

		const response = await post({
			vacancyId: "vac1",
			candidateUserId: "cand1",
		});

		expect(response.status).toBe(403);
		expect(ensureVacancyOfferChat).not.toHaveBeenCalled();
	});
});
