/**
 * Snapshot of the top games for the LinkedIn post: reads the catalogue, ranks
 * the public projects by a blend of devlog activity, applause and views, and
 * writes the result — covers and team avatars downloaded beside it — to
 * `docs/marketing/top-games/<date>/` and `latest/` (covers also to
 * `docs/design/images/top-games/<date>/`), which the frame
 * "Marketing · LinkedIn · Top games" in docs/design/platform-design.pen is
 * rebuilt from.
 * Read-only.
 *
 *   bun run top-games            # local database, top 3
 *   bun run top-games:prod 10    # production, top 10
 */
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { ProjectStatus } from "@gdhub-io/gdhub-prisma";
import { GAME_SCORE_WEIGHTS, gameScores } from "@/lib/scout/game-score";
import { getGameScoreInputs } from "@/repositories/project/score";
import { CONFIRMED_MEMBERS } from "@/repositories/project/team";
import { ABANDONED_FILTER } from "@/repositories/scout/games";
import { prisma } from "@/services/prisma";
import { announceDbTarget } from "./_db-target";

const limit = Number(process.argv[2] ?? 3);
// The slide shows this many faces and folds the rest into the count.
const AVATARS = 5;
const now = new Date();
const date = now.toISOString().slice(0, 10);
const outDir = path.join(process.cwd(), "docs/marketing/top-games", date);

announceDbTarget(`Ranking top ${limit} games`);

// Only what has a public page: the post links people to it.
const projects = await prisma.project.findMany({
	where: {
		status: { in: [ProjectStatus.Approved, ProjectStatus.Released] },
		...ABANDONED_FILTER,
	},
	select: {
		id: true,
		name: true,
		slug: true,
		coverImage: true,
		description: true,
		coreMechanics: true,
		genre: true,
		platform: true,
		status: true,
		workflow: { select: { currentStep: { select: { name: true } } } },
		team: {
			select: {
				members: {
					where: CONFIRMED_MEMBERS,
					orderBy: { startedAt: "asc" },
					select: { user: { select: { image: true } } },
				},
			},
		},
	},
});

const inputs = await getGameScoreInputs(
	projects.map((project) => project.id),
	now,
);
const rows = projects.map((project, index) => ({ project, ...inputs[index] }));
const scores = gameScores(inputs);

// The carousel slide has room for a short paragraph, not the whole pitch.
const excerpt = (text: string | null, max = 320) => {
	const plain = (text ?? "")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/<[^>]+>|[#*_`>]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	if (plain.length <= max) return plain;
	return `${plain.slice(0, plain.lastIndexOf(" ", max))}…`;
};

const top = rows
	.map((row, index) => ({ ...row, score: scores[index] }))
	.sort((a, b) => b.score - a.score || b.activity - a.activity)
	.slice(0, limit);

await mkdir(path.join(outDir, "covers"), { recursive: true });

/** Saves an image as `<name>.<ext>`, the extension taken from what the host sent. */
const download = async (
	src: string,
	name: string,
	size: Record<string, string>,
): Promise<string | null> => {
	const url = new URL(src);
	if (url.hostname === "cdn.sanity.io") {
		for (const [key, value] of Object.entries(size)) {
			url.searchParams.set(key, value);
		}
		url.searchParams.set("fm", "jpg");
		// A transparent PNG turns black as JPEG without a background.
		url.searchParams.set("bg", "F5F4F2");
	}
	const response = await fetch(url).catch(() => null);
	if (!response?.ok) return null;
	const type = response.headers.get("content-type") ?? "";
	const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
	const file = `${name}.${ext}`;
	await writeFile(path.join(outDir, file), Buffer.from(await response.arrayBuffer()));
	return file;
};

const games = await Promise.all(
	top.map(async (row, index) => {
		const rank = index + 1;
		const cover = row.project.coverImage
			? await download(row.project.coverImage, `covers/${rank}`, {
					w: "640",
				})
			: null;

		const members = row.project.team?.members ?? [];
		const avatars: string[] = [];
		for (const [k, member] of members.slice(0, AVATARS).entries()) {
			const file = member.user.image
				? await download(member.user.image, `covers/team-${rank}-${k + 1}`, {
						w: "96",
						h: "96",
						fit: "crop",
					})
				: null;
			if (file) avatars.push(file);
		}

		return {
			rank,
			name: row.project.name,
			url: `https://gdhub.io/project/${row.project.slug}`,
			description: excerpt(row.project.description),
			mechanics: row.project.coreMechanics,
			genre: row.project.genre,
			platform: row.project.platform,
			stage: row.project.workflow?.currentStep?.name ?? null,
			released: row.project.status === ProjectStatus.Released,
			score: row.score,
			activity: row.activity,
			applause: row.applause,
			views: row.views,
			cover,
			teamSize: members.length,
			avatars,
		};
	}),
);

const snapshot = {
	date,
	weights: GAME_SCORE_WEIGHTS,
	ranked: rows.length,
	games,
};

await writeFile(
	path.join(outDir, "top-games.json"),
	`${JSON.stringify(snapshot, null, "\t")}\n`,
);

console.table(
	games.map(({ rank, name, score, activity, applause, views }) => ({
		rank,
		name,
		score,
		activity,
		applause,
		views,
	})),
);
const latestDir = path.join(outDir, "..", "latest");
await rm(latestDir, { recursive: true, force: true });
await cp(outDir, latestDir, { recursive: true });
// The canvas only loads images beside the .pen file, and caches them by path —
// a dated folder keeps last month's picture off this month's frame.
await cp(
	path.join(outDir, "covers"),
	path.join(process.cwd(), "docs/design/images/top-games", date),
	{ recursive: true },
);

console.info(`\nWritten to ${path.relative(process.cwd(), outDir)}/ and latest/`);

await prisma.$disconnect();
