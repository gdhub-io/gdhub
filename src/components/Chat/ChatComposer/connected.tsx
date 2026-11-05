import { useTranslate } from "@tolgee/react";
import { App } from "antd";
import { EventType } from "matrix-js-sdk";
import type { RoomMessageEventContent } from "matrix-js-sdk/lib/@types/events";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { CHAT_IMAGE_MAX_BYTES } from "@/config/chat";
import {
	type ChatImageRef,
	type ChatMessagePayload,
	editContent,
	messageContent,
} from "@/helpers/chat-media";
import { ImageTooLargeError, uploadChatImage } from "../media/pick-image";
import { useChat } from "../useChat";
import type { ComposerAttachment } from "./AttachmentChip";
import { ChatComposer } from "./index";

type Attachment = ComposerAttachment & {
	image?: ChatImageRef;
	abort?: AbortController;
};

/**
 * Sends without waiting: the local echo shows at once as "Sending…", and a
 * failure stays in the timeline with Retry instead of a toast.
 *
 * `onSend` and `onEditSend` replace the Matrix send of a new message and of an
 * edit (the image upload still goes through the user's client); the composer
 * clears only once `onSend` resolves.
 */
export function ConnectedComposer({
	roomId,
	onSend,
	onEditSend,
	notice,
}: {
	roomId: string;
	onSend?: (payload: ChatMessagePayload) => Promise<void>;
	/** Replaces the Matrix send of an edit (GDHub posts are edited by the server). */
	onEditSend?: (eventId: string, payload: ChatMessagePayload) => Promise<void>;
	notice?: ReactNode;
}) {
	const { t } = useTranslate();
	const { message } = App.useApp();
	const draft = useChat((s) => s.drafts[roomId] ?? "");
	const mode = useChat((s) => s.modes[roomId] ?? null);
	const { setDraft, setMode } = useChat.getState();
	const [attachment, setAttachment] = useState<Attachment | null>(null);
	const [sending, setSending] = useState(false);
	const attachmentRef = useRef(attachment);
	attachmentRef.current = attachment;

	const discard = (current: Attachment | null) => {
		current?.abort?.abort();
		if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
	};

	// A picked image belongs to the room it was picked in.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset on room change only
	useEffect(() => {
		setAttachment(null);
		return () => discard(attachmentRef.current);
	}, [roomId]);

	const attach = async (file: File) => {
		const client = useChat.getState().chatClient;
		if (!client) return;
		const abort = new AbortController();
		const base = {
			name: file.name,
			previewUrl: URL.createObjectURL(file),
			abort,
		};
		// Later updates apply only while this pick is still the current one.
		const update = (next: Attachment) =>
			setAttachment((current) => (current?.abort === abort ? next : current));
		setAttachment({ ...base, status: "uploading", progress: 0 });

		try {
			const image = await uploadChatImage(client, file, {
				abortController: abort,
				onProgress: (progress) =>
					update({ ...base, status: "uploading", progress }),
			});
			update({
				...base,
				name: image.name,
				status: "ready",
				size: image.size,
				image,
			});
		} catch (error) {
			if (abort.signal.aborted) return;
			update({
				...base,
				status: "error",
				error:
					error instanceof ImageTooLargeError
						? t("chat.media.tooLarge", "File too large (max {mb} MB)", {
								mb: CHAT_IMAGE_MAX_BYTES / (1024 * 1024),
							})
						: t("chat.media.uploadFailed", "Couldn't upload the image"),
			});
		}
	};

	const removeAttachment = () => {
		discard(attachment);
		setAttachment(null);
	};

	const clear = () => {
		setMode(roomId, null);
		setDraft(roomId, "");
		discard(attachment);
		setAttachment(null);
	};

	const submit = () => {
		const text = draft.trim();
		const client = useChat.getState().chatClient;
		if (!client || sending) return;

		if (mode?.type === "edit") {
			// A picture may lose its caption; a text message may not become empty.
			if (text === mode.original.trim() || (!text && !mode.image)) {
				setMode(roomId, null);
				return;
			}
			const change = { text, image: mode.image };
			(onEditSend
				? onEditSend(mode.eventId, change)
				: client.sendEvent(
						roomId,
						EventType.RoomMessage,
						editContent(
							mode.eventId,
							messageContent(change),
						) as RoomMessageEventContent,
					)
			).catch(() =>
				message.error(
					t("chat.message.actionFailed", "Couldn't update the message"),
				),
			);
			setMode(roomId, null);
			setDraft(roomId, "");
			return;
		}

		const image = attachment?.image;
		if (!text && !image) return;

		if (onSend) {
			setSending(true);
			onSend({ text: text || undefined, image })
				.then(clear)
				.catch(() =>
					message.error(t("chat.composer.sendFailed", "Couldn't send")),
				)
				.finally(() => setSending(false));
			return;
		}

		const reply = mode?.type === "reply" && {
			"m.relates_to": { "m.in_reply_to": { event_id: mode.eventId } },
		};
		// A picture and its text are one event: the text is the image's caption.
		client
			.sendEvent(roomId, EventType.RoomMessage, {
				...messageContent({ text, image }),
				...reply,
			} as RoomMessageEventContent)
			.catch(() => undefined);
		clear();
	};

	return (
		<ChatComposer
			autoFocus
			value={draft}
			onChange={(value) => setDraft(roomId, value)}
			onSubmit={submit}
			mode={mode}
			onCancelMode={() => setMode(roomId, null)}
			notice={notice}
			attachment={attachment}
			onAttach={attach}
			onRemoveAttachment={removeAttachment}
		/>
	);
}
