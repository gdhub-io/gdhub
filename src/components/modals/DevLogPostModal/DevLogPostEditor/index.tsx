"use client";

import EditorJS, { type OutputData } from "@editorjs/editorjs";
import { type RefObject, useEffect, useRef } from "react";
import styles from "./style.module.scss";
import { tools } from "./tools";

export default function DevLogPostEditor({
	editorRef,
	initialData,
	placeholder,
	onChange,
}: {
	editorRef: RefObject<EditorJS | null>;
	initialData?: OutputData;
	placeholder: string;
	onChange: (content: OutputData) => void;
}) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// A holder per mount: `destroy()` empties its holder, and under StrictMode
		// the first editor is torn down after the second has already rendered.
		const holder = document.createElement("div");
		containerRef.current?.appendChild(holder);

		const editor = new EditorJS({
			holder,
			autofocus: true,
			inlineToolbar: true,
			minHeight: 0,
			placeholder,
			sanitizer: {
				paragraph: {
					preserveNewlines: true,
				},
			},
			data: initialData,
			tools,
			onChange: async (api) => onChange(await api.saver.save()),
		});
		editorRef.current = editor;

		return () => {
			editorRef.current = null;
			// `destroy` only exists once `isReady` has resolved.
			editor.isReady
				.then(() => editor.destroy())
				.catch(() => {})
				.finally(() => holder.remove());
		};
	}, [editorRef, initialData, placeholder, onChange]);

	return <div ref={containerRef} className={styles.editor} />;
}
