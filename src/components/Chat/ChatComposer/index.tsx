import {
	IconCornerDownRight,
	IconMoodSmile,
	IconPencil,
	IconSend,
	IconX,
} from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Input, Popover } from "antd";
import type { TextAreaRef } from "antd/es/input/TextArea";
import { EmojiPicker } from "frimousse";
import { useEffect, useRef, useState } from "react";
import type { ComposerMode } from "../useChat";
import styles from "./style.module.scss";

type ChatComposerProps = {
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	mode?: ComposerMode | null;
	onCancelMode?: () => void;
	autoFocus?: boolean;
};

/** The message box under a conversation. Frames `YGPUq`, `X7HUy`, `hycZ7`. */
export function ChatComposer({
	value,
	onChange,
	onSubmit,
	mode,
	onCancelMode,
	autoFocus,
}: ChatComposerProps) {
	const { t } = useTranslate();
	const inputRef = useRef<TextAreaRef>(null);
	const [emojiOpen, setEmojiOpen] = useState(false);
	const empty = !value.trim();

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
							if (!empty) onSubmit();
						}
					}}
				/>
				<div className={styles.tools}>
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
					<Button
						type="primary"
						icon={mode?.type === "edit" ? undefined : <IconSend size={16} />}
						disabled={empty}
						onClick={onSubmit}
						aria-label={t("chat.composer.send", "Send")}
					>
						{mode?.type === "edit" && t("chat.composer.save", "Save")}
					</Button>
				</div>
			</div>
		</div>
	);
}
