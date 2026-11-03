"use client";

import {
	IconArrowBackUp,
	IconHelpCircle,
	IconPencil,
} from "@tabler/icons-react";
import { Button, Flex, Form, Tooltip, Typography } from "antd";
import type { ReactNode } from "react";
import { StatusDot } from "@/components/ui";
import styles from "./InheritedField.module.scss";

/** The one thing a goal field cannot say by its name. */
export const GOAL_TOOLTIP =
	"Read by the AI curator only; the author never sees it.";

/**
 * A field a project may take over from its template (GDHUB-97, frames 10.09.1
 * and 10.09.3): read-only with the template's value until the project writes
 * its own, then editable and marked as differing from the template.
 */
export function InheritedField({
	label,
	tooltip,
	own,
	inherited,
	editor,
	onOwn,
	onUseTemplate,
}: {
	label: string;
	tooltip?: string;
	/** The project holds its own value. */
	own: boolean;
	/** The template's value, as it reads. */
	inherited: ReactNode;
	/** The editable field, while the project holds its own value. */
	editor: ReactNode;
	onOwn: () => void;
	onUseTemplate: () => void;
}) {
	return (
		<Form.Item
			className={styles.item}
			style={{ marginBottom: 0 }}
			label={
				<Flex align="center" justify="space-between" className={styles.label}>
					<Flex align="center" gap={8}>
						{label}
						{tooltip && (
							<Tooltip title={tooltip}>
								<IconHelpCircle size={14} className={styles.hint} />
							</Tooltip>
						)}
						{own && <StatusDot tone="warning" label="Differs from template" />}
					</Flex>
					<Button
						type="link"
						size="small"
						icon={
							own ? <IconArrowBackUp size={14} /> : <IconPencil size={14} />
						}
						onClick={own ? onUseTemplate : onOwn}
					>
						{own ? "Use the template's" : "Write this project's own"}
					</Button>
				</Flex>
			}
		>
			{own ? (
				editor
			) : (
				// ui-guard-ignore frame 10.09.1 draws the template's value as a filled read-only block, not a disabled control.
				<div className={styles.inherited}>
					{inherited || <Typography.Text type="secondary">—</Typography.Text>}
				</div>
			)}
		</Form.Item>
	);
}
