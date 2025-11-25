"use client";

import EditorJS, { type OutputData } from "@editorjs/editorjs";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useCallback, useEffect, useRef } from "react";
import styles from "./style.module.scss";
import { tools } from "./tools";

export default function DevLogPostEditor({
	postId,
	onContentChange,
}: {
	postId?: string;
	onContentChange: (content: OutputData | undefined) => void;
}) {
	const editorInstance = useRef<EditorJS | null>(null);

	const editorHolderId = "dev-log-post-editor";
	const editorHolderRef = useRef<HTMLDivElement>(null);
	const editorInitialized = useRef(false);

	const { data: post } = useQuery({
		queryKey: ["devlog-post-editor", postId],
		queryFn: () => {
			return axios.get(`/api/user/project/report?id=${postId}`);
		},
		enabled: !!postId,
		gcTime: 0,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		refetchOnReconnect: false,
		refetchInterval: false,
		refetchIntervalInBackground: false,
	});

	const initEditor = useCallback(async () => {
		if (editorInstance.current !== null) return;

		try {
			// Determine initial content based on whether we have document data or not
			const initialContent = post?.data?.contentEditor || {};

			// Clear EditorJS cache to prevent showing stale data
			if (typeof window !== "undefined" && window.localStorage) {
				const editorCacheKey = `editorjs-${editorHolderId}`;
				localStorage.removeItem(editorCacheKey);
			}

			editorInstance.current = new EditorJS({
				holder: editorHolderId,
				autofocus: true,
				readOnly: false,
				inlineToolbar: true,
				minHeight: 30,
				placeholder: "Start typing your post...",
				sanitizer: {
					paragraph: {
						preserveNewlines: true,
					},
				},
				data: initialContent,
				tools: tools,
				onReady: () => {
					editorInitialized.current = true;

					// [for development environment] Remove all codex-editor elements except the first one
					const children =
						editorHolderRef.current?.getElementsByClassName("codex-editor");
					if (children && children.length > 1) {
						children[0].remove();
					}
				},
				onChange: async () => {
					try {
						const content: OutputData | undefined =
							await editorInstance.current?.save();
						onContentChange(content);
					} catch (error) {
						console.warn("Error saving editor content:", error);
					}
				},
			});

			editorInitialized.current = true;
		} catch (error) {
			console.error("Error initializing editor:", error);
			editorInitialized.current = false;
		}
	}, [post, onContentChange]);

	const destroyEditor = useCallback(() => {
		if (editorInstance.current) {
			try {
				editorInstance.current.destroy();
				editorInstance.current = null;
				editorInitialized.current = false;
				if (editorHolderRef.current) editorHolderRef.current.innerHTML = "";
			} catch (error) {
				console.warn("Error destroying editor:", error);
			}
		}
		editorInstance.current = null;
		editorInitialized.current = false;
	}, []);

	useEffect(() => {
		if (post?.data) {
			// Clear EditorJS cache and reinitialize editor with document content when data is loaded
			if (typeof window !== "undefined" && window.localStorage) {
				const editorCacheKey = `editorjs-${editorHolderId}`;
				localStorage.removeItem(editorCacheKey);
			}

			// Destroy existing editor and reinitialize with new data
			if (editorInstance.current) {
				destroyEditor();
				// Small delay to ensure cleanup is complete
				setTimeout(() => {
					initEditor();
				}, 100);
			} else {
				initEditor();
			}
		}
	}, [post, initEditor, destroyEditor]);

	useEffect(() => {
		// Check if the component is mounted
		if (typeof window === "undefined") return;

		// Only initialize editor if we have document data or if this is a new document (no id)
		if (post?.data || !postId) {
			initEditor();
		}

		return () => {
			destroyEditor();
		};
	}, [initEditor, destroyEditor, post, postId]);

	return (
		<div>
			<div className={styles.postContainer}>
				<div id={editorHolderId} ref={editorHolderRef} />
			</div>
		</div>
	);
}
