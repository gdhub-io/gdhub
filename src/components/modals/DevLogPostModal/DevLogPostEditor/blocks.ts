import type EditorJS from "@editorjs/editorjs";
import type { BlockToolData } from "@editorjs/editorjs";
// @ts-expect-error - dist/index.d.ts exists but package.json `exports` lacks a "types" entry
import Embed from "@editorjs/embed";

type EmbedService = {
	regex: RegExp;
	embedUrl: string;
	width?: number;
	height?: number;
	id?: (ids: string[]) => string;
};

/**
 * The data the embed tool builds when a link is pasted, or null when no service
 * recognises it. The tool only reacts to a paste, so a link typed into the
 * toolbar has to be resolved the same way by hand.
 */
export function embedDataFromUrl(url: string) {
	// The editor does this at init; repeating it keeps the helper usable alone.
	Embed.prepare({ config: {} });

	const services = Object.entries(Embed.services) as [string, EmbedService][];
	for (const [service, config] of services) {
		const match = config.regex.exec(url);
		// Whole-string match, as on paste: a link inside a sentence is not a video.
		if (!match?.[0] || match[0] !== url) continue;

		const id = (config.id ?? ((ids) => ids[0]))(match.slice(1));

		return {
			service,
			source: url,
			embed: config.embedUrl.replace(/<%= remote_id %>/g, id),
			width: config.width,
			height: config.height,
		};
	}

	return null;
}

/**
 * Inserts a block where the caret was: in place of an empty block, after a
 * written one, and at the end when the editor never had the caret (`-1`).
 */
export function insertBlock(
	editor: EditorJS,
	caretIndex: number,
	type: string,
	data: BlockToolData = {},
) {
	const index =
		caretIndex < 0 ? editor.blocks.getBlocksCount() - 1 : caretIndex;
	const replace = !!editor.blocks.getBlockByIndex(index)?.isEmpty;
	const target = replace ? index : index + 1;

	editor.blocks.insert(type, data, undefined, target, true, replace);
	// `needToFocus` only marks the block as current; the caret has to be sent.
	editor.caret.setToBlock(target, "start");
}
