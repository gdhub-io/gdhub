"use client";

import type EditorJS from "@editorjs/editorjs";
import { useEffect, useId, useRef } from "react";
import { tools } from "@/components/admin/BlogPostEditor/tools";
import styles from "./style.module.scss";

/** JSON with its keys sorted: the database returns them in its own order. */
const sorted = (value: unknown): unknown =>
	Array.isArray(value)
		? value.map(sorted)
		: value && typeof value === "object"
			? Object.fromEntries(
					Object.keys(value)
						.sort()
						.map((key) => [
							key,
							sorted((value as Record<string, unknown>)[key]),
						]),
				)
			: value;

/** A text's blocks as what they say, without the ids Editor.js adds. */
const sameBlocks = (blocks: { type: string; data: unknown }[]) =>
	JSON.stringify(sorted(blocks.map(({ type, data }) => ({ type, data }))));

/**
 * An Editor.js field inside an admin form (GDHUB-97, frame 10.09): the blog
 * editor's tools, images through `/api/file`. Uncontrolled after mount — give it
 * a `key` to load other content, as switching the selected step does.
 */
export function EditorJsField({
	value,
	onChange,
	placeholder,
}: {
	value?: PrismaJson.EditorJsContent | null;
	onChange: (value: PrismaJson.EditorJsContent) => void;
	placeholder?: string;
}) {
	const holder = `editorjs-${useId().replace(/:/g, "")}`;
	const editor = useRef<EditorJS | null>(null);
	// The latest handler, without re-creating the editor on every render.
	const changed = useRef(onChange);
	changed.current = onChange;
	const initial = useRef(value);
	const last = useRef(sameBlocks(value?.blocks ?? []));

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const { default: Editor } = await import("@editorjs/editorjs");
			if (cancelled) return;
			editor.current = new Editor({
				holder,
				tools,
				minHeight: 120,
				placeholder,
				data: initial.current ?? undefined,
				onChange: async () => {
					const saved = await editor.current?.save();
					if (!saved) return;
					// Editor.js "changes" a text it has only just loaded — new ids, its own
					// key order; only a change of what the blocks say reaches the form.
					const now = sameBlocks(saved.blocks);
					if (now === last.current) return;
					last.current = now;
					changed.current(saved as PrismaJson.EditorJsContent);
				},
			});
		})();
		return () => {
			cancelled = true;
			editor.current?.destroy?.();
			editor.current = null;
		};
	}, [holder, placeholder]);

	// ui-guard-ignore Editor.js mounts itself into a plain holder element; antd has none to offer.
	return <div id={holder} className={styles.field} />;
}
