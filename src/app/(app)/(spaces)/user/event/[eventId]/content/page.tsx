"use client";

import type { OutputData } from "@editorjs/editorjs";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, message, theme } from "antd";
import axios from "axios";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { EventSpace } from "@/components/spaces/EventSpace";
import styles from "./style.module.scss";

export default function EventContentPage() {
	const { token } = theme.useToken();
	const { t } = useTranslate();
	const params = useParams<{ eventId?: string }>();
	const eventId = params?.eventId as string;

	const editorHolderId = "event-content-editor";
	const editorInstance = useRef<import("@editorjs/editorjs").default | null>(
		null,
	);
	const editorHolderRef = useRef<HTMLDivElement>(null);
	const editorInitialized = useRef(false);

	const { data: event, refetch: refetchEvent } = useQuery({
		queryKey: ["event", eventId],
		queryFn: () => axios.get(`/api/user/event/${eventId}`),
		enabled: !!eventId,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		refetchOnReconnect: false,
	});

	const { mutateAsync: saveContent, isPending: isSaving } = useMutation({
		mutationFn: (content: OutputData) => {
			return axios.put(`/api/user/event/${eventId}`, {
				content,
			});
		},
		onSuccess: () => {
			refetchEvent();
			message.success(t("event.content.saved", "Content saved successfully"));
		},
		onError: () => {
			message.error(t("event.content.saveError", "Failed to save content"));
		},
	});

	const initEditor = useCallback(async () => {
		if (editorInitialized.current || editorInstance.current !== null) return;

		try {
			const EditorJS = (await import("@editorjs/editorjs")).default;
			const { tools } = await import("@/components/admin/BlogPostEditor/tools");

			// Determine initial content based on whether we have document data or not
			const initialContent = event?.data?.content || {};

			// Clear EditorJS cache to prevent showing stale data
			if (typeof window !== "undefined" && window.localStorage) {
				const editorCacheKey = `editorjs-${editorHolderId}`;
				localStorage.removeItem(editorCacheKey);
			}

			editorInstance.current = new EditorJS({
				holder: editorHolderId,
				autofocus: false,
				readOnly: false,
				inlineToolbar: true,
				minHeight: 30,
				placeholder: t("event.content.placeholder", "Start typing..."),
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
			});

			editorInitialized.current = true;
		} catch (error) {
			console.error("Error initializing editor:", error);
			editorInitialized.current = false;
		}
	}, [event?.data?.content, t]);

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
		// Check if the component is mounted
		if (typeof window === "undefined") return;

		// Only initialize editor if we have event data
		if (event?.data) {
			initEditor();
		}

		return () => {
			destroyEditor();
		};
	}, [initEditor, destroyEditor, event]);

	const handleSaveContent = async () => {
		if (!editorInstance.current) return;

		try {
			const content = await editorInstance.current.save();
			await saveContent(content);
		} catch (error) {
			console.error("Error saving content:", error);
			message.error(t("event.content.saveError", "Failed to save content"));
		}
	};

	return (
		<EventSpace
			title={t("event.content.title", "Event description")}
			description={t("event.content.hint", "Describe the event in detail.")}
			actions={
				<Button
					icon={<IconDeviceFloppy />}
					onClick={handleSaveContent}
					loading={isSaving}
					type="primary"
				>
					{t("event.content.saveButton", "Save")}
				</Button>
			}
		>
			<div className={styles.editorContainer}>
				<div
					className={styles.editor}
					style={{
						backgroundColor: token.colorBgBase,
						borderRadius: token.borderRadius,
					}}
				>
					<div id={editorHolderId} ref={editorHolderRef} />
				</div>
			</div>
		</EventSpace>
	);
}
