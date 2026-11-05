/**
 * Public Notion pages render in the browser, so their HTML is an empty shell.
 * Their blocks come from the JSON API the Notion web app itself calls, with no
 * login for a page shared to the web.
 */

import {
	fetchBody,
	type OpenFailure,
} from "@/services/artifact-check/safe-fetch";

const CHUNK_SIZE = 100;
const MAX_CHUNKS = 10;
const MAX_CHUNK_BYTES = 5 * 1024 * 1024;

export type NotionPage = { api: string; pageId: string };

type RichText = [string, ...unknown[]][];

type Block = {
	id: string;
	type: string;
	properties?: Record<string, RichText>;
	content?: string[];
	format?: { table_block_column_order?: string[] };
};

/** A block record as Notion stores it: the newer format wraps the value once more. */
type BlockRecord = { value?: Block | { value?: Block } };

export type NotionBlocks = Record<string, BlockRecord>;

const ID =
	/[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}(?![0-9a-f])/gi;

const dashed = (id: string) => {
	const hex = id.replace(/-/g, "").toLowerCase();
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/** A public Notion page link: the API on the same host, and the page's id. */
export function notionPage(link: string): NotionPage | null {
	let url: URL;
	try {
		url = new URL(link);
	} catch {
		return null;
	}
	if (url.protocol !== "https:" && url.protocol !== "http:") return null;
	const host = url.hostname.toLowerCase();
	const site = host.endsWith(".notion.site");
	if (!site && host !== "notion.so" && host !== "www.notion.so") return null;

	// `?p=` is the page opened over a database; any other query is ignored.
	const id =
		url.searchParams.get("p")?.match(ID)?.[0] ?? url.pathname.match(ID)?.at(-1);
	if (!id) return null;

	return {
		api: `https://${site ? host : "www.notion.so"}/api/v3/loadPageChunk`,
		pageId: dashed(id),
	};
}

const block = (blocks: NotionBlocks, id: string): Block | null => {
	const value = blocks[id]?.value;
	if (!value) return null;
	return "type" in value ? value : (value.value ?? null);
};

const plain = (text: RichText | undefined) =>
	(text ?? []).map((segment) => segment[0]).join("");

const PREFIX: Record<string, string> = {
	header: "# ",
	sub_header: "## ",
	sub_sub_header: "### ",
	bulleted_list: "- ",
	quote: "> ",
	callout: "> ",
	toggle: "▸ ",
};

/**
 * The page's words in reading order: the page and the blocks inside it, never
 * the sub-pages it links to. Images are counted, not read.
 */
export function notionText(
	blocks: NotionBlocks,
	pageId: string,
): { text: string; images: number } {
	const lines: string[] = [];
	let images = 0;
	const page = block(blocks, pageId);
	if (!page) return { text: "", images };

	const title = plain(page.properties?.title);
	if (title) lines.push(`Page title: ${title}`);

	const walk = (ids: string[], depth: number) => {
		let number = 0;
		for (const id of ids) {
			const b = block(blocks, id);
			if (!b) continue;
			number = b.type === "numbered_list" ? number + 1 : 0;
			const indent = "  ".repeat(depth);
			const text = plain(b.properties?.title);

			if (b.type === "page") {
				if (text) lines.push(`${indent}Sub-page (not read): ${text}`);
				continue;
			}
			if (b.type === "image" || b.type === "video") {
				images++;
				continue;
			}
			if (b.type === "table") {
				const columns = b.format?.table_block_column_order ?? [];
				for (const rowId of b.content ?? []) {
					const row = block(blocks, rowId);
					if (!row) continue;
					lines.push(
						`${indent}| ${columns.map((c) => plain(row.properties?.[c])).join(" | ")} |`,
					);
				}
				continue;
			}

			if (text) {
				if (b.type === "to_do") {
					const done = plain(b.properties?.checked) === "Yes";
					lines.push(`${indent}[${done ? "x" : " "}] ${text}`);
				} else if (b.type === "numbered_list") {
					lines.push(`${indent}${number}. ${text}`);
				} else if (b.type === "code") {
					lines.push(`${indent}\`\`\`\n${text}\n${indent}\`\`\``);
				} else {
					lines.push(`${indent}${PREFIX[b.type] ?? ""}${text}`);
				}
			}
			// Columns are layout: their blocks read at the same depth.
			const nested = b.type === "column_list" || b.type === "column" ? 0 : 1;
			if (b.content) walk(b.content, depth + nested);
		}
	};
	walk(page.content ?? [], 0);

	return { text: lines.join("\n"), images };
}

/** The page's blocks, chunk after chunk, or why they could not be loaded. */
export async function loadNotionBlocks(
	page: NotionPage,
): Promise<
	| { ok: true; blocks: NotionBlocks }
	| { ok: false; reason: OpenFailure | "tooLarge" | "notAccepted" }
> {
	const blocks: NotionBlocks = {};
	let cursor: { stack: unknown[] } = { stack: [] };

	for (let chunkNumber = 0; chunkNumber < MAX_CHUNKS; chunkNumber++) {
		const fetched = await fetchBody(
			page.api,
			MAX_CHUNK_BYTES,
			(type) => type === "application/json",
			{
				pageId: page.pageId,
				limit: CHUNK_SIZE,
				cursor,
				chunkNumber,
				verticalColumns: false,
			},
		);
		if (!fetched.ok) return fetched;

		let chunk: {
			cursor?: { stack?: unknown[] };
			recordMap?: { block?: NotionBlocks };
		};
		try {
			chunk = JSON.parse(new TextDecoder().decode(fetched.body.bytes));
		} catch {
			return { ok: false, reason: "unreachable" };
		}
		Object.assign(blocks, chunk.recordMap?.block);
		if (!chunk.cursor?.stack?.length) break;
		cursor = { stack: chunk.cursor.stack };
	}

	return { ok: true, blocks };
}
