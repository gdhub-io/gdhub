import { IconChevronDown } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Popover, Tag } from "antd";
import { useState } from "react";
import { StatusDot } from "@/components/ui";
import type { ChatContextSlot } from "./kinds";
import styles from "./style.module.scss";

type ChatContextLineProps = {
	slot: ChatContextSlot;
	defaultOpen?: boolean;
};

/**
 * One line of room context under the conversation header; everything else a
 * kind wants to say lives in the popover it opens. Frame `kWwIn`.
 */
export function ChatContextLine({ slot, defaultOpen }: ChatContextLineProps) {
	const { t } = useTranslate();
	const [open, setOpen] = useState(!!defaultOpen);
	const closed = slot.status === "closed";

	const content = (
		<div className={styles.popover}>
			<div className={styles.popoverBody}>
				<div className={styles.popoverTitle}>
					<span>{slot.title}</span>
					<StatusDot
						tone={closed ? "neutral" : "success"}
						label={
							slot.statusLabel ??
							(closed
								? t("chat.context.closed", "Closed")
								: t("chat.context.open", "Open"))
						}
					/>
				</div>
				{slot.fields.map((field) => (
					<div key={field.label} className={styles.field}>
						<span className={styles.fieldLabel}>{field.label}</span>
						<span className={styles.fieldValue}>{field.value}</span>
					</div>
				))}
			</div>
			{slot.actions.length > 0 && (
				<div className={styles.popoverFooter}>{slot.actions}</div>
			)}
		</div>
	);

	return (
		<Popover
			open={open}
			onOpenChange={setOpen}
			trigger="click"
			placement="bottom"
			arrow={false}
			content={content}
			classNames={{ container: styles.popoverContainer }}
		>
			<button
				type="button"
				className={styles.line}
				data-open={open || undefined}
				aria-expanded={open}
			>
				<Tag className={styles.tag}>{slot.tag}</Tag>
				<span className={styles.summary}>{slot.summary}</span>
				{closed && (
					<StatusDot
						tone="neutral"
						label={t("chat.context.closed", "Closed")}
					/>
				)}
				<IconChevronDown size={16} className={styles.chevron} />
			</button>
		</Popover>
	);
}
