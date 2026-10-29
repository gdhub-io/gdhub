"use client";

import { IconX } from "@tabler/icons-react";
import { Button, Input, Tooltip } from "antd";
import { useState } from "react";
import { CHECKPOINT_ITEM_TEXT_MAX } from "@/config/checkpoint";

/** Saved on blur or Enter; an emptied or refused field goes back to what was saved. */
export function TaskInput({
	text,
	placeholder,
	autoFocus,
	warning,
	onSave,
	onEmpty,
	onRemove,
	removeLabel,
}: {
	text: string;
	placeholder?: string;
	autoFocus?: boolean;
	warning?: boolean;
	onSave: (text: string) => Promise<void>;
	onEmpty?: () => void;
	onRemove?: () => void;
	removeLabel?: string;
}) {
	const [value, setValue] = useState(text);

	const commit = () => {
		const next = value.trim();
		if (!next) {
			setValue(text);
			onEmpty?.();
			return;
		}
		if (next === text) return;
		onSave(next).catch(() => setValue(text));
	};

	return (
		<Input
			value={value}
			placeholder={placeholder}
			autoFocus={autoFocus}
			status={warning ? "warning" : undefined}
			maxLength={CHECKPOINT_ITEM_TEXT_MAX}
			onChange={(event) => setValue(event.target.value)}
			onBlur={commit}
			onPressEnter={(event) => event.currentTarget.blur()}
			suffix={
				onRemove && (
					<Tooltip title={removeLabel}>
						<Button
							type="text"
							size="small"
							aria-label={removeLabel}
							icon={<IconX size={14} />}
							onClick={onRemove}
						/>
					</Tooltip>
				)
			}
		/>
	);
}
