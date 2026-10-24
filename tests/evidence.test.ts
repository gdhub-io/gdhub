import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	devlogMediaLines,
	devlogMediaLinks,
	seeCheckpointEvidence,
	seeDevlogMedia,
} from "@/repositories/evidence-seen";
import { fetchBody } from "@/services/artifact-check/safe-fetch";
import { describeMedia, judgeEvidence } from "@/services/evidence/judge";
import { readableLink } from "@/services/evidence/links";
import { readEvidence } from "@/services/evidence/read";
import { prisma } from "@/services/prisma";

vi.mock("@/services/artifact-check/safe-fetch", () => ({ fetchBody: vi.fn() }));
vi.mock("@/services/evidence/frames", () => ({
	videoFrames: vi.fn(async (_: Uint8Array, maxSeconds: number) => ({
		frames: [new Uint8Array([1])],
		seconds: Math.min(90, maxSeconds),
	})),
}));
vi.mock("@/repositories/artifact-check", () => ({ checkArtifact: vi.fn() }));
vi.mock("@/services/evidence/judge", () => ({
	judgeEvidence: vi.fn(async () => ({ match: "Matches", note: "A level." })),
	describeMedia: vi.fn(async () => "A level."),
}));
vi.mock("@/services/prisma", () => ({
	prisma: {
		projectCheckpoint: { findUnique: vi.fn() },
		projectReport: { findUnique: vi.fn() },
		checkpointItem: { findMany: vi.fn(), update: vi.fn() },
		checkpointJournalEntry: {
			findMany: vi.fn(async () => []),
			create: vi.fn(async () => ({})),
		},
	},
}));

const body = (contentType: string, text = "") => ({
	ok: true as const,
	body: {
		contentType,
		bytes: new TextEncoder().encode(text),
		url: "https://example.com/x",
	},
});

const started = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
const aiCheckpoint = {
	id: "cp1",
	startedAt: started,
	curatorKind: "AI",
	status: "Active",
};
const journalled = () =>
	vi.mocked(prisma.checkpointJournalEntry.create).mock.calls.map(
		([args]) => args.data,
	);

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue(
		aiCheckpoint as never,
	);
	vi.mocked(prisma.checkpointJournalEntry.findMany).mockResolvedValue([]);
});

describe("share links the curator can read", () => {
	it.each([
		[
			"https://drive.google.com/file/d/AbC_1/view?usp=sharing",
			"https://drive.google.com/uc?export=download&id=AbC_1",
		],
		[
			"https://docs.google.com/document/d/D0c/edit",
			"https://docs.google.com/document/d/D0c/export?format=txt",
		],
		[
			"https://docs.google.com/spreadsheets/d/Sh/edit#gid=0",
			"https://docs.google.com/spreadsheets/d/Sh/export?format=csv",
		],
		[
			"https://docs.google.com/presentation/d/Sl/edit",
			"https://docs.google.com/presentation/d/Sl/export/txt",
		],
		[
			"https://www.dropbox.com/s/abc/level.mp4?dl=0",
			"https://www.dropbox.com/s/abc/level.mp4?dl=1",
		],
		[
			"https://github.com/team/game/blob/main/docs/gdd.md",
			"https://raw.githubusercontent.com/team/game/main/docs/gdd.md",
		],
	])("%s is read from %s", (link, url) => {
		expect(readableLink(link).url).toBe(url);
	});

	it("marks YouTube and Vimeo as pages read from what the provider publishes", () => {
		expect(readableLink("https://youtu.be/abc").videoPage).toBe("youtube");
		expect(readableLink("https://vimeo.com/123").videoPage).toBe("vimeo");
		expect(readableLink("https://example.com/a.mp4").videoPage).toBeUndefined();
	});
});

describe("reading what is behind a link", () => {
	it("reads a page as its words, without scripts", async () => {
		vi.mocked(fetchBody).mockResolvedValue(
			body(
				"text/html",
				"<title>Devlog</title><script>x()</script><p>The boss fight</p>",
			),
		);

		const read = await readEvidence("https://example.com/x", {
			videoSecondsLeft: 600,
		});

		expect(read.text).toContain("Page title: Devlog");
		expect(read.text).toContain("The boss fight");
		expect(read.text).not.toContain("x()");
	});

	it("takes frames from a video and charges its seconds", async () => {
		vi.mocked(fetchBody).mockResolvedValue(body("video/mp4"));

		const read = await readEvidence("https://example.com/a.mp4", {
			videoSecondsLeft: 600,
		});

		expect(read.images).toHaveLength(1);
		expect(read.videoSeconds).toBe(90);
	});

	it("looks at no video once the sprint's budget is spent", async () => {
		vi.mocked(fetchBody).mockResolvedValue(body("video/mp4"));

		const read = await readEvidence("https://example.com/a.mp4", {
			videoSecondsLeft: 0,
		});

		expect(read.images).toHaveLength(0);
		expect(read.unread).toContain("budget");
	});

	it("never takes a build file, only a page", async () => {
		vi.mocked(fetchBody).mockResolvedValue({
			ok: false,
			reason: "notAccepted",
		});

		const read = await readEvidence("https://example.com/game.zip", {
			videoSecondsLeft: 600,
			pageOnly: true,
		});

		expect(vi.mocked(fetchBody).mock.calls[0][2]?.("application/zip")).toBe(
			false,
		);
		expect(read.unread).toContain("never downloaded");
	});

	it("says what it could not read rather than guessing", async () => {
		vi.mocked(fetchBody).mockResolvedValue(body("application/octet-stream"));

		const read = await readEvidence("https://example.com/blob", {
			videoSecondsLeft: 600,
		});

		expect(read.text).toBeNull();
		expect(read.unread).toContain("cannot read");
	});
});

describe("looking at a checkpoint's evidence", () => {
	const item = (id: string, link: string, seen: string | null = null) => ({
		id,
		text: `Task ${id}`,
		evidenceSeenLink: seen,
		artifact: { type: "GameplayVideo", name: null, description: null, link },
	});

	it("looks at a link once, again only when it changes, and journals what it read", async () => {
		vi.mocked(prisma.checkpointItem.findMany).mockResolvedValue([
			item("a", "https://example.com/a.png", "https://example.com/a.png"),
			item("b", "https://example.com/b.png", "https://example.com/old.png"),
		] as never);
		vi.mocked(fetchBody).mockResolvedValue(body("image/png"));

		await seeCheckpointEvidence("cp1");

		expect(judgeEvidence).toHaveBeenCalledTimes(1);
		expect(prisma.checkpointItem.update).toHaveBeenCalledWith({
			where: { id: "b" },
			data: {
				evidenceMatch: "Matches",
				evidenceMatchNote: "A level.",
				evidenceSeenLink: "https://example.com/b.png",
			},
		});
		expect(journalled()).toEqual([
			expect.objectContaining({
				kind: "Evidence",
				sprint: 2,
				itemId: "b",
				link: "https://example.com/b.png",
				input: expect.objectContaining({ task: "Task b", images: 1 }),
				output: { match: "Matches", note: "A level." },
			}),
		]);
	});

	it("pays for no model call when nothing could be read, and journals why", async () => {
		vi.mocked(prisma.checkpointItem.findMany).mockResolvedValue([
			item("a", "https://example.com/private"),
		] as never);
		vi.mocked(fetchBody).mockResolvedValue({ ok: false, reason: "needsLogin" });

		await seeCheckpointEvidence("cp1");

		expect(judgeEvidence).not.toHaveBeenCalled();
		expect(journalled()[0]).toMatchObject({
			input: { unread: "the link asks for a login" },
			output: { match: "CannotTell", note: "the link asks for a login" },
		});
	});

	it("spends only what is left of the sprint's video after earlier looks", async () => {
		vi.mocked(prisma.checkpointJournalEntry.findMany).mockResolvedValue([
			{ input: { videoSeconds: 550 } },
		] as never);
		vi.mocked(prisma.checkpointItem.findMany).mockResolvedValue([
			item("a", "https://example.com/a.mp4"),
			item("b", "https://example.com/b.mp4"),
		] as never);
		vi.mocked(fetchBody).mockResolvedValue(body("video/mp4"));

		await seeCheckpointEvidence("cp1");

		expect(
			journalled().map((entry) => (entry.input as { videoSeconds: number }).videoSeconds),
		).toEqual([50, 0]);
	});

	it("looks for a human curator too, and at nothing once the checkpoint is closed", async () => {
		vi.mocked(prisma.checkpointItem.findMany).mockResolvedValue([]);
		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue({
			...aiCheckpoint,
			curatorKind: "Human",
		} as never);
		await seeCheckpointEvidence("cp1");
		expect(prisma.checkpointItem.findMany).toHaveBeenCalledTimes(1);

		vi.mocked(prisma.projectCheckpoint.findUnique).mockResolvedValue({
			...aiCheckpoint,
			status: "Closed",
		} as never);
		await seeCheckpointEvidence("cp1");
		expect(prisma.checkpointItem.findMany).toHaveBeenCalledTimes(1);
	});
});

describe("looking at a devlog's media as it is posted", () => {
	const post = (checkpoint: object | null) => ({
		content: "Week 2: the boss fight https://example.com/shot.png",
		video: "https://example.com/clip.mp4",
		contentEditor: null,
		publishedAt: new Date(),
		checkpoint,
	});

	it("describes each new link once and journals it", async () => {
		vi.mocked(prisma.projectReport.findUnique).mockResolvedValue(
			post(aiCheckpoint) as never,
		);
		vi.mocked(prisma.checkpointJournalEntry.findMany).mockResolvedValue([
			{
				kind: "DevlogMedia",
				devlogId: "d1",
				link: "https://example.com/clip.mp4",
				input: { videoSeconds: 0 },
			},
		] as never);
		vi.mocked(fetchBody).mockResolvedValue(body("image/png"));

		await seeDevlogMedia("d1");

		expect(describeMedia).toHaveBeenCalledTimes(1);
		expect(journalled()).toEqual([
			expect.objectContaining({
				kind: "DevlogMedia",
				devlogId: "d1",
				link: "https://example.com/shot.png",
				output: { shows: "A level." },
			}),
		]);
	});

	it("leaves a devlog alone when no AI checkpoint is running", async () => {
		vi.mocked(prisma.projectReport.findUnique).mockResolvedValue(
			post({ ...aiCheckpoint, status: "Closed" }) as never,
		);

		await seeDevlogMedia("d1");

		expect(fetchBody).not.toHaveBeenCalled();
	});

	it("gives the review one line per link, from the journal", async () => {
		vi.mocked(prisma.projectReport.findUnique).mockResolvedValue(null);
		vi.mocked(prisma.checkpointJournalEntry.findMany).mockResolvedValue([
			{
				link: "https://example.com/shot.png",
				input: { unread: null },
				output: { shows: "A boss arena." },
			},
			{
				link: "https://example.com/private",
				input: { unread: "the link asks for a login" },
				output: { shows: null },
			},
		] as never);

		expect(await devlogMediaLines(["d1"])).toEqual([
			"- https://example.com/shot.png: A boss arena.",
			"- https://example.com/private: not read — the link asks for a login",
		]);
	});
});

describe("a devlog's images and videos", () => {
	it("are found in uploads, embeds, its video and media links in the text", () => {
		expect(
			devlogMediaLinks({
				content: "New level https://example.com/shot.png and notes",
				video: "https://youtu.be/abc",
				contentEditor: {
					blocks: [
						{
							type: "image",
							data: { file: { url: "https://cdn.sanity.io/x.png" } },
						},
						{ type: "embed", data: { source: "https://vimeo.com/1" } },
						{ type: "paragraph", data: { text: "hi" } },
					],
				},
			}),
		).toEqual([
			"https://youtu.be/abc",
			"https://cdn.sanity.io/x.png",
			"https://vimeo.com/1",
			"https://example.com/shot.png",
		]);
	});
});
