"use client";

import { IconX } from "@tabler/icons-react";
import { Button, Input, Tooltip } from "antd";
import { useState } from "react";
import { CHECKPOINT_ITEM_TEXT_MAX } from "@/config/checkpoint";
import styles from "./style.module.scss";

/** What every task field shares: the saved ones and the new one. */
export const taskFieldProps = {
	className: styles.taskInput,
	variant: "filled",
	maxLength: CHECKPOINT_ITEM_TEXT_MAX,
} as const;

/** Saved on blur or Enter; an emptied or refused field goes back to what was saved. */
export function TaskInput({
	text,
	warning,
	onSave,
	onRemove,
	removeLabel,
}: {
	text: string;
	warning?: boolean;
	onSave: (text: string) => Promise<void>;
	onRemove?: () => void;
	removeLabel?: string;
}) {
	const [value, setValue] = useState(text);

	const commit = () => {
		const next = value.trim();
		if (!next) {
			setValue(text);
			return;
		}
		if (next === text) return;
		onSave(next).catch(() => setValue(text));
	};

	return (
		<Input
			value={value}
			{...taskFieldProps}
			status={warning ? "warning" : undefined}
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
