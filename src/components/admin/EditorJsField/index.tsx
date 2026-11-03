"use client";

import type EditorJS from "@editorjs/editorjs";
import { useEffect, useId, useRef } from "react";
import { tools } from "@/components/admin/BlogPostEditor/tools";
import { sameBlocks } from "@/helpers/editorjs";
import styles from "./style.module.scss";

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
	const last = useRef(value?.blocks ?? []);

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
					if (sameBlocks(saved.blocks, last.current)) return;
					last.current = saved.blocks;
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
