/**
 * A throwaway database to check a screen against.
 *
 * Checking a screen by hand means being the right kind of person — an admin, an
 * advisor with questions waiting, a scout with a cabinet. Doing that on the
 * development database means editing real rows and hoping to undo them, which
 * is how the advisor space came to be verified by switching Dmitry's own
 * mentorship on.
 *
 *   bun run test-env up      # container, migrations, reference data, fixtures
 *   bun run test-env up --fresh
 *   bun run test-env status
 *   bun run test-env down
 *
 * Port 55432 on purpose: 5432 is where every other project's Postgres container
 * lands, and a screen silently reading the wrong database has cost this project
 * an afternoon before.
 */

import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

const CONTAINER = "gdhub_testdb";
const PORT = 55432;
const DATABASE = "gdhub_test";
// pgvector, not plain postgres: migration 20240221000000 creates the `vector`
// extension, and stock images fail on it with P3018.
const IMAGE = "pgvector/pgvector:pg16";

/** Applied one at a time, so a stale group cannot cost the whole database. */
const MOCK_GROUPS = ["superadmin", "users", "projects", "advisors", "courses"];

export const TEST_DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${PORT}/${DATABASE}`;

const docker = (args: string[], quiet = false) =>
	spawnSync("docker", args, {
		encoding: "utf8",
		stdio: quiet ? "pipe" : ["ignore", "pipe", "pipe"],
	});

const containerState = (): "running" | "stopped" | "absent" => {
	const result = docker(
		["inspect", "-f", "{{.State.Running}}", CONTAINER],
		true,
	);

	if (result.status !== 0) return "absent";

	return result.stdout.trim() === "true" ? "running" : "stopped";
};

/** Always with an explicit DATABASE_URL, so `.env` can never win. */
const against = (command: string, args: string[]) => {
	const result = spawnSync(command, args, {
		stdio: "inherit",
		env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
	});

	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(" ")} failed`);
	}
};

const prismaCli = (args: string[]) =>
	against("./node_modules/.bin/gdhub-prisma", args);

const delay = (ms: number) =>
	new Promise((resolve) => setTimeout(resolve, ms));

async function waitForPostgres() {
	const deadline = Date.now() + 60_000;

	while (Date.now() < deadline) {
		const ready = docker(
			["exec", CONTAINER, "pg_isready", "-U", "postgres", "-d", DATABASE],
			true,
		);

		if (ready.status === 0) return;
		await delay(1000);
	}

	throw new Error(`${CONTAINER} did not become ready within 60s`);
}

async function up(fresh: boolean) {
	if (fresh) {
		console.log(`Removing any previous ${CONTAINER}…`);
		docker(["rm", "-f", CONTAINER], true);
	}

	const state = containerState();
	const reused = state !== "absent";

	if (state === "absent") {
		console.log(`Starting ${IMAGE} as ${CONTAINER} on port ${PORT}…`);

		const created = docker([
			"run",
			"-d",
			"--name",
			CONTAINER,
			"-e",
			"POSTGRES_PASSWORD=postgres",
			"-e",
			`POSTGRES_DB=${DATABASE}`,
			"-p",
			`${PORT}:5432`,
			IMAGE,
		]);

		if (created.status !== 0) {
			throw new Error(`docker run failed: ${created.stderr}`);
		}
	} else if (state === "stopped") {
		console.log(`Starting the existing ${CONTAINER}…`);
		docker(["start", CONTAINER]);
	} else {
		console.log(`${CONTAINER} is already running — reusing it.`);
	}

	await waitForPostgres();

	console.log("\nApplying migrations…");
	prismaCli(["deploy"]);

	console.log("\nSeeding reference data…");
	prismaCli(["seed"]);

	// The permission matrix is generated from the space registry in this repo,
	// so the package's seed cannot carry it and never has.
	console.log("\nSeeding the permission matrix…");
	against("bun", ["run", "scripts/rbac-seed-matrix.ts"]);

	const unapplied: string[] = [];

	// The fixtures are written once, into a new database: run again over their own
	// rows they collide with what the app has since built on them.
	if (reused) {
		console.log("\nFixtures are already in; `up --fresh` rebuilds them from scratch.");
	} else {
		console.log("\nAdding fixtures…");
		for (const group of MOCK_GROUPS) {
			try {
				prismaCli(["mock", group]);
			} catch {
				unapplied.push(group);
			}
		}
	}

	console.log("\nCreating the personas…");
	process.env.DATABASE_URL = TEST_DATABASE_URL;
	const { ensureAllPersonas, PERSONAS } = await import("../tests/personas");
	await ensureAllPersonas();
	console.log(`  ${PERSONAS.map((persona) => persona.key).join(", ")}`);

	if (unapplied.length > 0) {
		console.warn(
			`\nThese fixture groups failed and are missing: ${unapplied.join(", ")}.` +
				"\nEverything else is in, and the personas below do not depend on them.",
		);
	}

	console.log(`
Ready.

  DATABASE_URL=${TEST_DATABASE_URL}

Run the app against it, with the test sign-in screen enabled:

  bun run dev:test                              # to look around
  bun run stand:build && bun run stand:start    # for the e2e suite

Then open http://localhost:3100/dev-signin and pick who to be.
`);
}

function down() {
	// What a stand leaves behind; compiled output is not worth keeping between runs.
	rmSync(".next-test", { recursive: true, force: true });

	if (containerState() === "absent") {
		console.log(`${CONTAINER} is not there.`);
		return;
	}

	docker(["rm", "-f", CONTAINER]);
	console.log(`${CONTAINER} removed. Its data went with it.`);
}

function status() {
	const state = containerState();

	console.log(`${CONTAINER}: ${state}`);
	if (state === "running") console.log(`DATABASE_URL=${TEST_DATABASE_URL}`);
}

const command = process.argv[2] ?? "status";

const main = async () => {
	switch (command) {
		case "up":
			return up(process.argv.includes("--fresh"));
		case "down":
			return down();
		case "status":
			return status();
		default:
			console.error(`test-env: unknown command "${command}". Use up | down | status.`);
			process.exit(1);
	}
};

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
