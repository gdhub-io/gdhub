"use client";

import Blocks, {
	type Block,
	type DataProp,
} from "editorjs-blocks-react-renderer";
import { useMemo } from "react";
import { editorjsRenderers } from "@/helpers/editorjs-renderers";
import { sanitizeEditorJsData } from "@/lib/content/sanitize-html";

type RawEditorJs = { time?: unknown; version?: unknown; blocks?: unknown };

export interface SafeBlocksProps {
	/** editor.js output as stored: a JSON string or the parsed object. */
	data: string | RawEditorJs | null | undefined;
}

const parse = (data: SafeBlocksProps["data"]): RawEditorJs | null => {
	if (typeof data !== "string") return data ?? null;
	try {
		return JSON.parse(data);
	} catch {
		return null;
	}
};

const prepare = (data: SafeBlocksProps["data"]): DataProp | null => {
	const raw = parse(data);
	const blocks = Array.isArray(raw?.blocks)
		? (raw.blocks as Block[]).filter((b) => !!b?.type && b.data !== undefined)
		: [];
	if (!blocks.length) return null;
	return sanitizeEditorJsData({
		time: typeof raw?.time === "number" ? raw.time : 0,
		version: typeof raw?.version === "string" ? raw.version : "",
		blocks,
	});
};

/** Author-written editor.js content, sanitized once per value and rendered with the shared renderers. */
export const SafeBlocks = ({ data }: SafeBlocksProps) => {
	const prepared = useMemo(() => prepare(data), [data]);
	return prepared ? (
		<Blocks data={prepared} renderers={editorjsRenderers} />
	) : null;
};
