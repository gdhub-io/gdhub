"use client";

import type { OutputData } from "@editorjs/editorjs";
import {
	IconBrandYoutube,
	IconCheck,
	IconDeviceFloppy,
	IconList,
	IconListCheck,
	IconListNumbers,
	IconPhoto,
	IconQuote,
	IconSeparator,
	IconTable,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslate } from "@tolgee/react";
import { Button, Flex, message, Select, Tooltip } from "antd";
import axios from "axios";
import dayjs from "dayjs";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { EventSpace } from "@/components/spaces/EventSpace";
import { useEvent } from "@/hooks/event";
import styles from "./style.module.scss";

export default function EventContentPage() {
	const { t } = useTranslate();
	const params = useParams<{ eventId?: string }>();
	const eventId = params?.eventId as string;

	const editorHolderId = "event-content-editor";
	const editorInstance = useRef<import("@editorjs/editorjs").default | null>(
		null,
	);
	const editorHolderRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLDivElement>(null);
	const editorInitialized = useRef(false);

	const { event, refetch: refetchEvent } = useEvent(eventId);

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

			// The column holds an Editor.js document as JSON; an event with nothing
			// written yet opens on an empty one. Typed now that the event comes back
			// as a real record rather than `any`.
			const initialContent =
				(event?.content as OutputData | null) ?? ({ blocks: [] } as OutputData);

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
	}, [event?.content, t]);

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
		if (event) {
			initEditor();
		}

		return () => {
			destroyEditor();
		};
	}, [initEditor, destroyEditor, event]);

	/**
	 * Keeps the caret in view while typing.
	 *
	 * The document scrolls inside the card rather than with the page, and a
	 * browser only scrolls a caret into view for the scroller it considers the
	 * document's own — so a line typed at the bottom edge walks out of sight.
	 */
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const follow = () => {
			const selection = window.getSelection();
			if (!selection?.rangeCount) return;

			const caret = selection.getRangeAt(0).getBoundingClientRect();
			// A collapsed range at the start of an empty block has no box to read.
			if (!caret.height) return;

			const view = canvas.getBoundingClientRect();
			const margin = 48;

			if (caret.bottom > view.bottom - margin) {
				canvas.scrollTop += caret.bottom - view.bottom + margin;
			} else if (caret.top < view.top + margin) {
				canvas.scrollTop -= view.top + margin - caret.top;
			}
		};

		canvas.addEventListener("input", follow);
		canvas.addEventListener("keyup", follow);
		return () => {
			canvas.removeEventListener("input", follow);
			canvas.removeEventListener("keyup", follow);
		};
	}, []);

	/**
	 * Adds a block through Editor.js's public API, so the toolbar and the "+"
	 * menu put the same thing in the document.
	 */
	const insertBlock = (type: string, data?: Record<string, unknown>) => {
		editorInstance.current?.blocks.insert(type, data);
	};

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
				<Flex align="center" gap={12}>
					{/* When it was last written down: the one fact that decides
					    whether it is safe to close the tab. */}
					{event?.updatedAt && (
						<Flex align="center" gap={6} className={styles.saved}>
							<IconCheck size={14} />
							{t("event.content.savedAt", "Saved")}{" "}
							{dayjs(event.updatedAt).fromNow()}
						</Flex>
					)}
					<Button
						icon={<IconDeviceFloppy />}
						onClick={handleSaveContent}
						loading={isSaving}
						type="primary"
					>
						{t("event.content.saveButton", "Save")}
					</Button>
				</Flex>
			}
		>
			<div className={styles.editor}>
				{/* Only what the editor is actually configured with: the design also
				    shows a code button, and there is no code tool to put behind it. */}
				<Flex
					align="center"
					justify="center"
					gap={4}
					className={styles.toolbar}
				>
					<Select
						size="small"
						variant="borderless"
						value="paragraph"
						onChange={(value) => insertBlock(value)}
						popupMatchSelectWidth={false}
						options={[
							{ value: "paragraph", label: t("editor.block.text", "Text") },
							{ value: "header", label: t("editor.block.heading", "Heading") },
						]}
					/>
					<span className={styles.divider} />
					<Tooltip title={t("editor.block.list", "Bulleted list")}>
						<Button
							type="text"
							size="small"
							icon={<IconList size={16} />}
							onClick={() => insertBlock("list", { style: "unordered" })}
						/>
					</Tooltip>
					<Tooltip title={t("editor.block.listOrdered", "Numbered list")}>
						<Button
							type="text"
							size="small"
							icon={<IconListNumbers size={16} />}
							onClick={() => insertBlock("list", { style: "ordered" })}
						/>
					</Tooltip>
					<Tooltip title={t("editor.block.checklist", "Checklist")}>
						<Button
							type="text"
							size="small"
							icon={<IconListCheck size={16} />}
							onClick={() => insertBlock("checklist")}
						/>
					</Tooltip>
					<Tooltip title={t("editor.block.quote", "Quote")}>
						<Button
							type="text"
							size="small"
							icon={<IconQuote size={16} />}
							onClick={() => insertBlock("quote")}
						/>
					</Tooltip>
					<span className={styles.divider} />
					<Tooltip title={t("editor.block.image", "Image")}>
						<Button
							type="text"
							size="small"
							icon={<IconPhoto size={16} />}
							onClick={() => insertBlock("image")}
						/>
					</Tooltip>
					<Tooltip title={t("editor.block.table", "Table")}>
						<Button
							type="text"
							size="small"
							icon={<IconTable size={16} />}
							onClick={() => insertBlock("table")}
						/>
					</Tooltip>
					<Tooltip title={t("editor.block.embed", "Embed")}>
						<Button
							type="text"
							size="small"
							icon={<IconBrandYoutube size={16} />}
							onClick={() => insertBlock("embed")}
						/>
					</Tooltip>
					<Tooltip title={t("editor.block.delimiter", "Divider")}>
						<Button
							type="text"
							size="small"
							icon={<IconSeparator size={16} />}
							onClick={() => insertBlock("delimiter")}
						/>
					</Tooltip>
				</Flex>

				<div className={styles.canvas} ref={canvasRef}>
					<div className={styles.sheet}>
						<div id={editorHolderId} ref={editorHolderRef} />
					</div>
				</div>
			</div>
		</EventSpace>
	);
}
