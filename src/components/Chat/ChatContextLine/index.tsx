import { IconChevronDown } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Tag } from "antd";
import { useEffect, useId, useRef, useState } from "react";
import { StatusDot } from "@/components/ui";
import type { ChatContextField, ChatContextSlot } from "./kinds";
import styles from "./style.module.scss";

type ChatContextLineProps = {
	slot: ChatContextSlot;
	defaultOpen?: boolean;
};

// Consecutive "half" fields share a row.
function rowsOf(fields: ChatContextField[]): ChatContextField[][] {
	const rows: ChatContextField[][] = [];
	for (const field of fields) {
		const last = rows[rows.length - 1];
		if (field.span === "half" && last?.[0]?.span === "half") last.push(field);
		else rows.push([field]);
	}
	return rows;
}

/**
 * One line of room context under the conversation header. It drops a section
 * down over the timeline — the messages underneath do not move. Frames
 * `kWwIn`, `uRZrC`, `G1YeC`.
 */
export function ChatContextLine({ slot, defaultOpen }: ChatContextLineProps) {
	const { t } = useTranslate();
	const [open, setOpen] = useState(!!defaultOpen);
	const wrapRef = useRef<HTMLDivElement>(null);
	const sectionId = useId();
	const wasClosed = useRef(slot.closed);

	// Closing the chat from here collapses the block.
	useEffect(() => {
		if (slot.closed && !wasClosed.current) setOpen(false);
		wasClosed.current = slot.closed;
	}, [slot.closed]);

	// Outside clicks and Esc collapse it; confirms opened from it don't count.
	useEffect(() => {
		if (!open) return;
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target as Element;
			if (wrapRef.current?.contains(target)) return;
			if (target.closest?.(".ant-modal-root, .ant-message")) return;
			setOpen(false);
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};
		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	return (
		<div ref={wrapRef} className={styles.wrap} data-open={open || undefined}>
			<button
				type="button"
				className={styles.line}
				aria-expanded={open}
				aria-controls={sectionId}
				aria-label={t("chat.context.toggle", "Show details")}
				onClick={() => setOpen(!open)}
			>
				<Tag className={styles.tag}>{slot.tag}</Tag>
				<span className={styles.summary}>{slot.summary}</span>
				{slot.closed && (
					<StatusDot
						tone="neutral"
						label={t("chat.context.closed", "Closed")}
					/>
				)}
				<IconChevronDown size={16} className={styles.chevron} />
			</button>
			{open && (
				// A layer the panel's Esc must close before the panel itself.
				<div id={sectionId} className={styles.section} data-chat-layer>
					<div className={styles.fields}>
						{rowsOf(slot.fields).map((row) => (
							<div key={row[0].label} className={styles.row}>
								{row.map((field) => (
									<div key={field.label} className={styles.field}>
										<span className={styles.fieldLabel}>{field.label}</span>
										<span className={styles.fieldValue}>{field.value}</span>
									</div>
								))}
							</div>
						))}
					</div>
					{slot.actions.length > 0 && (
						<div className={styles.actions}>
							{slot.actions.map((action) => (
								<Button
									key={action.key}
									type={action.primary ? "primary" : "default"}
									href={action.href}
									target={action.href ? "_blank" : undefined}
									rel={action.href ? "noopener noreferrer" : undefined}
									onClick={action.onClick}
								>
									{action.label}
								</Button>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
