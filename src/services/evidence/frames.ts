import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";

const run = promisify(execFile);

/** At most this many frames from one video (Dmitry, 2026-10-24). */
const FRAMES_PER_VIDEO = 12;
const FFMPEG_TIMEOUT_MS = 60_000;

const durationOf = (log: string) => {
	const match = log.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
	return match
		? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
		: null;
};

/**
 * Frames spread evenly over a video, as small JPEGs, and how many seconds of it
 * they cover. Only the first `maxSeconds` are looked at: the sprint's budget.
 * The file is written to a temporary folder and removed afterwards.
 */
export async function videoFrames(bytes: Uint8Array, maxSeconds: number) {
	if (!ffmpegPath) throw new Error("ffmpeg is not available");
	const dir = await mkdtemp(join(tmpdir(), "gdhub-frames-"));
	try {
		const input = join(dir, "video");
		await writeFile(input, bytes);

		// ffmpeg with no output exits non-zero but prints the duration.
		const probe = await run(ffmpegPath, ["-hide_banner", "-i", input], {
			timeout: FFMPEG_TIMEOUT_MS,
		}).catch((error: { stderr?: string }) => ({ stderr: error.stderr ?? "" }));
		const duration = durationOf(probe.stderr);
		if (!duration) return { frames: [], seconds: 0 };

		const seconds = Math.min(duration, maxSeconds);
		await run(
			ffmpegPath,
			[
				"-hide_banner",
				"-loglevel",
				"error",
				"-t",
				String(seconds),
				"-i",
				input,
				"-vf",
				`fps=${FRAMES_PER_VIDEO / seconds},scale=640:-2`,
				"-frames:v",
				String(FRAMES_PER_VIDEO),
				"-q:v",
				"6",
				join(dir, "frame-%02d.jpg"),
			],
			{ timeout: FFMPEG_TIMEOUT_MS },
		);

		const names = (await readdir(dir))
			.filter((name) => name.startsWith("frame-"))
			.sort();
		const frames = await Promise.all(
			names.map((name) => readFile(join(dir, name))),
		);

		return { frames: frames.map((frame) => new Uint8Array(frame)), seconds };
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}
