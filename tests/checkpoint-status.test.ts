import { readFileSync } from "node:fs";
import path from "node:path";
import { glob } from "glob";
import { describe, expect, it } from "vitest";
import { CheckpointStatus } from "@/config/prisma-enums";
import {
	canMove,
	checkpointMove,
	IllegalCheckpointMove,
} from "@/lib/checkpoints/status";

const { Draft, AwaitingCurator, Active, Review, Closed, Cancelled } =
	CheckpointStatus;
const ALL = Object.values(CheckpointStatus);

/** docs/checkpoints-status-flow.d2, edge for edge. */
const ALLOWED: [CheckpointStatus, CheckpointStatus][] = [
	[Draft, AwaitingCurator],
	[Draft, Active],
	[Draft, Cancelled],
	[AwaitingCurator, Active],
	[AwaitingCurator, Draft],
	[AwaitingCurator, Cancelled],
	[Active, Review],
	[Active, Closed],
	[Active, Cancelled],
	[Review, Closed],
	[Review, Cancelled],
];

describe("checkpoint moves", () => {
	it("allows exactly the moves on the diagram", () => {
		const allowed = ALL.flatMap((from) =>
			ALL.filter((to) => canMove(from, to)).map((to) => [from, to]),
		);
		expect(allowed).toEqual(expect.arrayContaining(ALLOWED));
		expect(allowed).toHaveLength(ALLOWED.length);
	});

	it.each([
		[Closed, Cancelled],
		[Cancelled, Draft],
		[Active, Draft],
		[Active, AwaitingCurator],
		[Review, Active],
		[Draft, Review],
		[Draft, Closed],
	])("refuses %s → %s", (from, to) => {
		expect(() => checkpointMove(from, to)).toThrow(IllegalCheckpointMove);
	});

	it("refuses a set with one illegal member", () => {
		expect(() => checkpointMove([Active, Closed], Cancelled)).toThrow(
			IllegalCheckpointMove,
		);
	});

	it("puts the expected status in the WHERE", () => {
		expect(checkpointMove([Active, Review], Closed)).toEqual({
			where: { status: { in: [Active, Review] } },
			data: { status: Closed },
		});
	});
});

const ROOT = path.resolve(__dirname, "..");
const WRITE = /projectCheckpoint\.(update|updateMany|updateManyAndReturn|upsert)\(/g;

/** The text of the call's argument list, from its opening parenthesis. */
const callArgs = (source: string, open: number) => {
	let depth = 0;
	for (let i = open; i < source.length; i++) {
		if (source[i] === "(") depth++;
		if (source[i] === ")" && --depth === 0) return source.slice(open, i + 1);
	}
	return source.slice(open);
};

/** The call without its `where: { … }`, which may name a status to match on. */
const withoutWhere = (args: string) => {
	const at = args.search(/\bwhere\s*:\s*\{/);
	if (at === -1) return args;
	let depth = 0;
	for (let i = args.indexOf("{", at); i < args.length; i++) {
		if (args[i] === "{") depth++;
		if (args[i] === "}" && --depth === 0)
			return args.slice(0, at) + args.slice(i + 1);
	}
	return args;
};

describe("checkpoint status writes", () => {
	it("are made only through checkpointMove", async () => {
		const files = await glob("{src,scripts}/**/*.{ts,tsx}", { cwd: ROOT });
		const offenders: string[] = [];

		for (const file of files) {
			const source = readFileSync(path.join(ROOT, file), "utf8");
			for (const match of source.matchAll(WRITE)) {
				const open = (match.index ?? 0) + match[0].length - 1;
				if (/\bstatus\s*:/.test(withoutWhere(callArgs(source, open)))) {
					const line = source.slice(0, match.index).split("\n").length;
					offenders.push(`${file}:${line}`);
				}
			}
		}

		expect(offenders).toEqual([]);
	});
});
