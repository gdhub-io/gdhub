import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** A file of the app read from disk, for the OG images that run on Node (the edge ones fetch theirs). */
export const ogAsset = (path: string) => readFile(join(process.cwd(), path));

export const dataUrl = (bytes: Buffer, type: string) =>
	`data:${type};base64,${bytes.toString("base64")}`;
