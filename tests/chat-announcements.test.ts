import { beforeEach, describe, expect, it, vi } from "vitest";

const chatRoomFindUnique = vi.fn();
const chatRoomUpsert = vi.fn();
vi.mock("@/services/prisma", () => ({
	prisma: {
		chatRoom: {
			findUnique: (...a: unknown[]) => chatRoomFindUnique(...a),
			upsert: (...a: unknown[]) => chatRoomUpsert(...a),
			update: vi.fn(),
		},
	},
}));

const getSpaceAccess = vi.fn();
vi.mock("@/services/access", () => ({
	getSpaceAccess: (...a: unknown[]) => getSpaceAccess(...a),
	isStaff: (access: { role: string }) =>
		access.role === "Admin" || access.role === "Owner",
}));

const cacheGet = vi.fn();
const cacheSet = vi.fn();
vi.mock("@/services/cache", () => ({
	cacheGet: (...a: unknown[]) => cacheGet(...a),
	cacheSet: (...a: unknown[]) => cacheSet(...a),
}));

const inviteUserToRoom = vi.fn();
vi.mock("@/services/matrix/admin", () => ({
	ensureMatrixUser: vi.fn(),
	inviteUserToRoom: (...a: unknown[]) => inviteUserToRoom(...a),
	uploadMatrixAvatarBytes: vi.fn(),
}));

const autoJoinRoom = vi.fn();
vi.mock("@/services/chat/auto-join", () => ({
	autoJoinRoom: (...a: unknown[]) => autoJoinRoom(...a),
}));

vi.mock("@/services/matrix/session", () => ({
	getMatrixUserToken: async () => ({ accessToken: "gdhub-token" }),
}));

vi.mock("@/helpers/env", () => ({
	env: (name: string) =>
		({
			MATRIX_CHAT_BASE_URL: "http://synapse",
			MATRIX_CHAT_HOMESERVER_DOMAIN: "matrix.gdhub.io",
		})[name] ?? "",
}));

import {
	AnnouncementEditSchema,
	AnnouncementPostSchema,
	MatrixEventIdSchema,
} from "../src/schemas/chat-announcements";
import {
	canPostAnnouncements,
	deleteAnnouncement,
	editAnnouncement,
	joinAnnouncements,
	postAnnouncement,
} from "../src/services/chat/announcements";

const fetchMock = vi.fn();

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal("fetch", fetchMock);
	fetchMock.mockImplementation(async () => new Response("{}", { status: 200 }));
	chatRoomFindUnique.mockResolvedValue({ matrixRoomId: "!ann" });
});

describe("canPostAnnouncements", () => {
	it("asks the hub access, fresh, for the session user", async () => {
		const user = { id: "u1" } as never;
		getSpaceAccess.mockResolvedValueOnce({ role: "Admin" });
		expect(await canPostAnnouncements(user)).toBe(true);
		getSpaceAccess.mockResolvedValueOnce({ role: "Member" });
		expect(await canPostAnnouncements(user)).toBe(false);
		expect(getSpaceAccess).toHaveBeenCalledWith("hub", null, user);
	});
});

describe("postAnnouncement", () => {
	it("sends a picture and its text as one captioned event, as GDHub", async () => {
		await postAnnouncement({
			text: "Hello",
			image: {
				url: "mxc://matrix.gdhub.io/abc",
				name: "cover.webp",
				mimetype: "image/webp",
				size: 1000,
				w: 10,
				h: 10,
			},
		});

		const sent = fetchMock.mock.calls.map(([url, init]) => ({
			url: String(url),
			auth: (init.headers as Record<string, string>).Authorization,
			body: JSON.parse(init.body as string),
		}));
		expect(sent).toHaveLength(1);
		expect(sent[0].url).toContain("/rooms/!ann/send/");
		expect(sent[0].auth).toBe("Bearer gdhub-token");
		expect(sent[0].body).toEqual({
			msgtype: "m.image",
			body: "Hello",
			filename: "cover.webp",
			url: "mxc://matrix.gdhub.io/abc",
			info: { mimetype: "image/webp", size: 1000, w: 10, h: 10 },
		});
	});
});

describe("joinAnnouncements", () => {
	it("skips Matrix entirely while the membership is remembered", async () => {
		cacheGet.mockResolvedValue(true);
		await joinAnnouncements("u1");
		expect(inviteUserToRoom).not.toHaveBeenCalled();
		expect(autoJoinRoom).not.toHaveBeenCalled();
	});

	it("remembers the membership only after a successful join", async () => {
		cacheGet.mockResolvedValue(undefined);
		autoJoinRoom.mockResolvedValueOnce(false);
		await joinAnnouncements("u1");
		expect(cacheSet).not.toHaveBeenCalled();

		autoJoinRoom.mockResolvedValueOnce(true);
		await joinAnnouncements("u1");
		expect(inviteUserToRoom).toHaveBeenCalledWith("gdhub", "!ann", "u1");
		expect(cacheSet).toHaveBeenCalledWith(
			"chat:announcements:joined:u1",
			true,
			expect.any(Number),
		);
	});
});

describe("room power levels", () => {
	it("lets members react and redact their own reaction, never post", async () => {
		chatRoomFindUnique.mockResolvedValue(null);
		chatRoomUpsert.mockResolvedValue({ id: "row", matrixRoomId: null });
		fetchMock.mockImplementation(
			async () =>
				new Response(JSON.stringify({ room_id: "!new" }), { status: 200 }),
		);

		const { ensureAnnouncementsRoom } = await import(
			"../src/services/chat/announcements"
		);
		await ensureAnnouncementsRoom().catch(() => {});

		const create = fetchMock.mock.calls.find(([url]) =>
			String(url).endsWith("/createRoom"),
		);
		expect(create).toBeDefined();
		const pl = JSON.parse(create?.[1].body).power_level_content_override;
		expect(pl.users).toEqual({ "@gdhub:matrix.gdhub.io": 100 });
		expect(pl.users_default).toBe(0);
		expect(pl.events_default).toBeGreaterThan(pl.users_default);
		expect(pl.events["m.reaction"]).toBe(0);
		expect(pl.events["m.room.redaction"]).toBe(0);
		expect(pl.redact).toBeGreaterThan(pl.users_default);
	});
});

const sentCalls = () =>
	fetchMock.mock.calls.map(([url, init]) => ({
		url: String(url),
		auth: (init.headers as Record<string, string>).Authorization,
		body: JSON.parse(init.body as string),
	}));

describe("editAnnouncement / deleteAnnouncement", () => {
	it("edits as a GDHub replacement of the given post", async () => {
		await editAnnouncement("$post", { text: "Fixed" });
		const [call] = sentCalls();
		expect(call.url).toContain("/rooms/!ann/send/m.room.message/");
		expect(call.auth).toBe("Bearer gdhub-token");
		expect(call.body["m.relates_to"]).toEqual({
			rel_type: "m.replace",
			event_id: "$post",
		});
		expect(call.body["m.new_content"]).toEqual({ msgtype: "m.text", body: "Fixed" });
	});

	it("deletes only inside the Announcements room", async () => {
		await deleteAnnouncement("$post");
		const [call] = sentCalls();
		expect(call.url).toContain("/rooms/!ann/redact/%24post/");
		expect(call.auth).toBe("Bearer gdhub-token");
	});
});

describe("announcement schemas", () => {
	const image = {
		name: "a.webp",
		mimetype: "image/webp",
		size: 10,
		w: 1,
		h: 1,
	};

	it("accepts media from our homeserver only", () => {
		expect(
			AnnouncementPostSchema.safeParse({
				image: { ...image, url: "mxc://matrix.gdhub.io/abc" },
			}).success,
		).toBe(true);
		expect(
			AnnouncementPostSchema.safeParse({
				image: { ...image, url: "mxc://evil.example/abc" },
			}).success,
		).toBe(false);
	});

	it("refuses an empty post and an empty edit", () => {
		expect(AnnouncementPostSchema.safeParse({ text: "  " }).success).toBe(false);
		expect(AnnouncementEditSchema.safeParse({ text: "" }).success).toBe(false);
	});

	it("takes only Matrix event ids", () => {
		expect(MatrixEventIdSchema.safeParse("$abc_DEF-1").success).toBe(true);
		expect(MatrixEventIdSchema.safeParse("../../admin").success).toBe(false);
	});
});

describe("image captions", () => {
	it("reads body as the caption only when a separate filename names the file", async () => {
		const { imageCaptionOf } = await import("../src/helpers/chat-media");
		expect(imageCaptionOf({ body: "Hi", filename: "a.png" })).toBe("Hi");
		expect(imageCaptionOf({ body: "a.png", filename: "a.png" })).toBeUndefined();
		expect(imageCaptionOf({ body: "a.png" })).toBeUndefined();
	});
});
