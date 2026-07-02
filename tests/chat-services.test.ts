import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/services/prisma";

vi.mock("@gdhub-io/gdhub-prisma/dist/client", () => ({
	default: {
		ChatRoomStatus: { Open: "Open", Closed: "Closed" },
		ChatRoomKind: {
			VacancyOffer: "VacancyOffer",
			AdviceRequest: "AdviceRequest",
			Direct: "Direct",
		},
		AdviceRequestStatus: { Closed: "Closed" },
		TeamVacancyStatus: { Published: "Published", Closed: "Closed" },
	},
}));

vi.mock("../src/services/prisma", () => ({
	prisma: {
		chatRoom: {
			findMany: vi.fn(),
			updateMany: vi.fn(),
			findUnique: vi.fn(),
			update: vi.fn(),
		},
		adviceRequest: { updateMany: vi.fn() },
		teamVacancy: { findUnique: vi.fn() },
	},
}));

vi.mock("../src/services/matrix/admin", () => ({
	makeRoomReadOnly: vi.fn(),
	makeRoomWritable: vi.fn(),
	inviteUserToRoom: vi.fn(),
}));

import type { ChatRoomRow } from "../src/services/chat/providers";
import { chatProviders } from "../src/services/chat/providers";
import {
	closeVacancyChats,
	vacancyChatDirectKey,
} from "../src/services/chat/vacancy-keys";
import { ensureVacancyOfferChat } from "../src/services/chat/vacancy-offer";
import {
	inviteUserToRoom,
	makeRoomReadOnly,
	makeRoomWritable,
} from "../src/services/matrix/admin";

beforeEach(() => {
	vi.clearAllMocks();
});

describe("closeVacancyChats", () => {
	it("closes the exact (vacancy, candidate) room and freezes it in Matrix", async () => {
		(prisma.chatRoom.findMany as any).mockResolvedValue([
			{ id: "cr1", matrixRoomId: "!room1" },
		]);

		const closed = await closeVacancyChats("vac1", "cand1");

		expect(closed).toBe(1);
		expect(prisma.chatRoom.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					directKey: vacancyChatDirectKey("vac1", "cand1"),
					status: "Open",
				}),
			}),
		);
		expect(prisma.chatRoom.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: { in: ["cr1"] } },
				data: expect.objectContaining({ status: "Closed" }),
			}),
		);
		expect(makeRoomReadOnly).toHaveBeenCalledWith("!room1");
	});

	it("closes every chat of the vacancy by key prefix when no candidate given", async () => {
		(prisma.chatRoom.findMany as any).mockResolvedValue([
			{ id: "cr1", matrixRoomId: "!a" },
			{ id: "cr2", matrixRoomId: "!b" },
		]);

		const closed = await closeVacancyChats("vac1");

		expect(closed).toBe(2);
		expect(prisma.chatRoom.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					directKey: { startsWith: "vacancy:vac1:" },
				}),
			}),
		);
		expect(makeRoomReadOnly).toHaveBeenCalledTimes(2);
	});

	it("does nothing when no open rooms match", async () => {
		(prisma.chatRoom.findMany as any).mockResolvedValue([]);

		const closed = await closeVacancyChats("vac1", "cand1");

		expect(closed).toBe(0);
		expect(prisma.chatRoom.updateMany).not.toHaveBeenCalled();
	});

	it("does not throw when the Matrix freeze fails", async () => {
		(prisma.chatRoom.findMany as any).mockResolvedValue([
			{ id: "cr1", matrixRoomId: "!room1" },
		]);
		(makeRoomReadOnly as any).mockRejectedValue(new Error("synapse down"));

		await expect(closeVacancyChats("vac1", "cand1")).resolves.toBe(1);
		expect(prisma.chatRoom.updateMany).toHaveBeenCalled();
	});
});

describe("chat providers", () => {
	const vacancyRoom: ChatRoomRow = {
		id: "cr1",
		kind: "VacancyOffer" as ChatRoomRow["kind"],
		status: "Open" as ChatRoomRow["status"],
		finishedAt: null,
		context: { vacancyId: "vac1", candidateUserId: "cand1" },
	};
	const vacancyLoaded = {
		ctx: { vacancyId: "vac1", candidateUserId: "cand1" },
		vacancy: {
			id: "vac1",
			title: "Position",
			offeredAmount: null,
			offeredRateType: null,
			promisePercentage: null,
			team: {
				project: { id: "p1", name: "P", slug: "p", authorId: "author1" },
			},
		},
	};

	it("vacancyOffer: only the candidate or the project author may close", () => {
		const provider = chatProviders.VacancyOffer!;
		expect(provider.canClose(vacancyRoom, vacancyLoaded, "cand1")).toBe(true);
		expect(provider.canClose(vacancyRoom, vacancyLoaded, "author1")).toBe(true);
		expect(provider.canClose(vacancyRoom, vacancyLoaded, "stranger")).toBe(
			false,
		);
	});

	it("vacancyOffer: participants are the candidate and the author", () => {
		const provider = chatProviders.VacancyOffer!;
		expect(provider.participantIds?.(vacancyRoom, vacancyLoaded)).toEqual([
			"cand1",
			"author1",
		]);
	});

	const adviceRoom: ChatRoomRow = {
		id: "cr2",
		kind: "AdviceRequest" as ChatRoomRow["kind"],
		status: "Open" as ChatRoomRow["status"],
		finishedAt: null,
		context: { adviceRequestId: "ar1", fromUserId: "from1", toUserId: "to1" },
	};
	const adviceLoaded = {
		id: "ar1",
		topic: "Topic",
		comment: null,
		status: "Approved",
		finishedAt: null,
		fromUserId: "from1",
		toUserId: "to1",
		project: null,
	};

	it("adviceRequest: context marks the expert side", () => {
		const provider = chatProviders.AdviceRequest!;
		const expertView = provider.buildContext(adviceRoom, adviceLoaded, "to1");
		const requesterView = provider.buildContext(
			adviceRoom,
			adviceLoaded,
			"from1",
		);

		expect(expertView.type).toBe("advice-request");
		expect(expertView.isExpert).toBe(true);
		expect(requesterView.isExpert).toBe(false);
	});

	it("adviceRequest: either participant may close, strangers may not", () => {
		const provider = chatProviders.AdviceRequest!;
		expect(provider.canClose(adviceRoom, adviceLoaded, "from1")).toBe(true);
		expect(provider.canClose(adviceRoom, adviceLoaded, "to1")).toBe(true);
		expect(provider.canClose(adviceRoom, adviceLoaded, "stranger")).toBe(false);
	});

	it("adviceRequest: onClose syncs the domain status to Closed", async () => {
		const provider = chatProviders.AdviceRequest!;
		await provider.onClose?.(adviceRoom);

		expect(prisma.adviceRequest.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: "ar1" }),
				data: expect.objectContaining({ status: "Closed" }),
			}),
		);
	});

	it("direct: chats are never closable", () => {
		const provider = chatProviders.Direct!;
		const directRoom: ChatRoomRow = {
			id: "cr3",
			kind: "Direct" as ChatRoomRow["kind"],
			status: "Open" as ChatRoomRow["status"],
			finishedAt: null,
			context: null,
		};
		expect(provider.canClose(directRoom, null, "anyone")).toBe(false);
	});
});

vi.mock("../src/services/chat/ensure-room", () => ({
	ensureChatRoom: vi.fn(),
}));

import { ensureChatRoom } from "../src/services/chat/ensure-room";

describe("ensureVacancyOfferChat reopen guard", () => {
	const publishedVacancy = {
		id: "vac1",
		title: "Position",
		status: "Published",
		team: { project: { name: "P", coverImage: null, authorId: "author1" } },
	};

	beforeEach(() => {
		(prisma.teamVacancy.findUnique as any).mockResolvedValue(publishedVacancy);
		(ensureChatRoom as any).mockResolvedValue({
			chatRoomId: "cr1",
			roomId: "!room1",
			created: false,
		});
	});

	it("reopens a Closed room only when allowReopen is set", async () => {
		(prisma.chatRoom.findUnique as any).mockResolvedValue({
			status: "Closed",
		});

		await ensureVacancyOfferChat({
			vacancyId: "vac1",
			candidateUserId: "cand1",
			initiatorUserId: "author1",
			allowReopen: true,
		});

		expect(prisma.chatRoom.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { status: "Open", finishedAt: null },
			}),
		);
		expect(makeRoomWritable).toHaveBeenCalledWith("!room1");
	});

	it("a bare open-chat call never resurrects a closed room", async () => {
		// Closed room, no allowReopen -> stays closed, no re-invite.
		(prisma.chatRoom.findUnique as any).mockResolvedValue({ status: "Closed" });

		const result = await ensureVacancyOfferChat({
			vacancyId: "vac1",
			candidateUserId: "cand1",
			initiatorUserId: "author1",
		});

		expect(prisma.chatRoom.update).not.toHaveBeenCalled();
		expect(makeRoomWritable).not.toHaveBeenCalled();
		expect(inviteUserToRoom).not.toHaveBeenCalled();
		expect(result.reinvited).toBe(false);
	});

	it("re-invites the invitee when the OPEN room's chat still exists", async () => {
		// e.g. the invitee left; re-offer must bring them back.
		(prisma.chatRoom.findUnique as any).mockResolvedValue({ status: "Open" });
		(inviteUserToRoom as any).mockResolvedValue(true);

		const result = await ensureVacancyOfferChat({
			vacancyId: "vac1",
			candidateUserId: "cand1",
			initiatorUserId: "author1",
		});

		expect(inviteUserToRoom).toHaveBeenCalledWith("author1", "!room1", "cand1");
		expect(result.reinvited).toBe(true);
	});

	it("never reopens chats of a closed vacancy", async () => {
		(prisma.teamVacancy.findUnique as any).mockResolvedValue({
			...publishedVacancy,
			status: "Closed",
		});

		await ensureVacancyOfferChat({
			vacancyId: "vac1",
			candidateUserId: "cand1",
			initiatorUserId: "author1",
			allowReopen: true,
		});

		expect(prisma.chatRoom.update).not.toHaveBeenCalled();
		expect(makeRoomWritable).not.toHaveBeenCalled();
	});
});
