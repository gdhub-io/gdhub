import {
	IconCornerDownRight,
	IconMoodSmile,
	IconPencil,
	IconPhoto,
	IconSend,
	IconX,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Input, Popover, Tooltip, Upload } from "antd";
import type { TextAreaRef } from "antd/es/input/TextArea";
import { EmojiPicker } from "frimousse";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { ComposerMode } from "../useChat";
import { AttachmentChip, type ComposerAttachment } from "./AttachmentChip";
import styles from "./style.module.scss";

export type { ComposerAttachment };

type ChatComposerProps = {
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	mode?: ComposerMode | null;
	onCancelMode?: () => void;
	autoFocus?: boolean;
	/** Shown in the box above the text, e.g. who the message is posted as. */
	notice?: ReactNode;
	attachment?: ComposerAttachment | null;
	/** Without it there is no attach button. */
	onAttach?: (file: File) => void;
	onRemoveAttachment?: () => void;
};

/** The message box under a conversation. Frames `YGPUq`, `X7HUy`, `hycZ7`. */
export function ChatComposer({
	value,
	onChange,
	onSubmit,
	mode,
	onCancelMode,
	autoFocus,
	notice,
	attachment,
	onAttach,
	onRemoveAttachment,
}: ChatComposerProps) {
	const { t } = useTranslate();
	const inputRef = useRef<TextAreaRef>(null);
	const [emojiOpen, setEmojiOpen] = useState(false);
	const editing = mode?.type === "edit";
	const blockedReason =
		attachment?.status === "uploading"
			? t("chat.media.waitForUpload", "Wait for the image to upload")
			: attachment?.status === "error"
				? t("chat.media.removeToSend", "Remove the image to send")
				: null;
	const canSend =
		!blockedReason && (!!value.trim() || attachment?.status === "ready");

	// Reply and edit both mean "type now".
	useEffect(() => {
		if (mode) inputRef.current?.focus();
	}, [mode]);

	const insertEmoji = (emoji: string) => {
		const el = inputRef.current?.resizableTextArea?.textArea;
		const start = el?.selectionStart ?? value.length;
		const end = el?.selectionEnd ?? value.length;
		onChange(value.slice(0, start) + emoji + value.slice(end));
		setEmojiOpen(false);
		requestAnimationFrame(() => {
			el?.focus();
			el?.setSelectionRange(start + emoji.length, start + emoji.length);
		});
	};

	return (
		<div className={styles.wrap}>
			<div className={styles.box}>
				{notice}
				{mode && (
					<div className={styles.strip}>
						{mode.type === "reply" ? (
							<IconCornerDownRight size={14} />
						) : (
							<IconPencil size={14} />
						)}
						<span className={styles.stripText}>
							{mode.type === "reply" ? (
								<>
									<strong>
										{t("chat.composer.replyingTo", "Replying to {name}:", {
											name: mode.senderName,
										})}
									</strong>{" "}
									{mode.preview}
								</>
							) : (
								<strong>{t("chat.composer.editing", "Editing message")}</strong>
							)}
						</span>
						<Button
							type="text"
							size="small"
							icon={<IconX size={16} />}
							aria-label={t("chat.composer.cancel", "Cancel")}
							onClick={onCancelMode}
						/>
					</div>
				)}
				{attachment && !editing && (
					<AttachmentChip
						attachment={attachment}
						onRemove={onRemoveAttachment}
					/>
				)}
				<Input.TextArea
					ref={inputRef}
					variant="borderless"
					autoSize={{ minRows: 1, maxRows: 6 }}
					autoFocus={autoFocus}
					value={value}
					placeholder={t("chat.composer.placeholder", "Write a message…")}
					className={styles.textarea}
					onChange={(event) => onChange(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Escape" && mode) {
							event.stopPropagation();
							onCancelMode?.();
							return;
						}
						// Enter sends; Shift+Enter and an IME composition insert.
						if (
							event.key === "Enter" &&
							!event.shiftKey &&
							!event.nativeEvent.isComposing
						) {
							event.preventDefault();
							if (canSend) onSubmit();
						}
					}}
				/>
				<div className={styles.tools}>
					<div className={styles.leftTools}>
						<Popover
							open={emojiOpen}
							onOpenChange={setEmojiOpen}
							trigger="click"
							placement="topLeft"
							arrow={false}
							classNames={{ container: styles.emojiPopover }}
							content={
								<EmojiPicker.Root
									className={styles.picker}
									columns={8}
									onEmojiSelect={({ emoji }) => insertEmoji(emoji)}
								>
									<EmojiPicker.Search className={styles.pickerSearch} />
									<EmojiPicker.Viewport className={styles.pickerViewport}>
										<EmojiPicker.Loading className={styles.pickerNote}>
											…
										</EmojiPicker.Loading>
										<EmojiPicker.Empty className={styles.pickerNote}>
											—
										</EmojiPicker.Empty>
										<EmojiPicker.List />
									</EmojiPicker.Viewport>
								</EmojiPicker.Root>
							}
						>
							<Button
								type="text"
								icon={<IconMoodSmile size={20} />}
								aria-label={t("chat.composer.emoji", "Emoji")}
							/>
						</Popover>
						{/* An edit replaces text only: it cannot attach. */}
						{onAttach && !editing && (
							<Upload
								accept="image/*"
								showUploadList={false}
								disabled={!!attachment}
								beforeUpload={(file) => {
									onAttach(file);
									return Upload.LIST_IGNORE;
								}}
							>
								<Button
									type="text"
									disabled={!!attachment}
									icon={<IconPhoto size={20} />}
									aria-label={t("chat.media.attachImage", "Attach image")}
								/>
							</Upload>
						)}
					</div>
					<div className={styles.sendTools}>
						<Tooltip title={blockedReason}>
							<Button
								type="primary"
								icon={editing ? undefined : <IconSend size={16} />}
								disabled={!canSend}
								onClick={onSubmit}
								aria-label={t("chat.composer.send", "Send")}
							>
								{editing && t("chat.composer.save", "Save")}
							</Button>
						</Tooltip>
					</div>
				</div>
			</div>
		</div>
	);
}
