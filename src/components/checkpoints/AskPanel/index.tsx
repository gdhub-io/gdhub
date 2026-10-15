"use client";

import { IconCheck, IconInfoCircle } from "@tabler/icons-react";
import { Card, Flex, Tag, Tooltip, Typography } from "antd";
import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./style.module.scss";

export type AskGlyph = "open" | "todo" | "done";

export type AskRow = {
	key: string;
	glyph: AskGlyph;
	title: string;
	/** Already-translated: who the row waits on. */
	owner?: string;
	/** Already-translated deadline, on the right of the title line. */
	due?: string;
	dueUrgent?: boolean;
	meta?: string;
	actions?: ReactNode;
};

export type AskPanelProps = {
	title: string;
	/** The tooltip behind the info icon; the sentence never sits in the layout. */
	info?: string;
	/** Already-translated count on the right of the head. */
	count?: string;
	countDone?: boolean;
	rows: AskRow[];
	/** The one forward action, with the reason it is locked beside it. */
	footer?: { note: string; action: ReactNode };
};

/**
 * The panel every step of the path carries — frame `Checkpoint — Page · a sprint
 * (Status)`, card `What this sprint asks of you`.
 *
 * Deliberately not tinted: an accent card with a brand border read as an error
 * zone. The emphasis is the ring on the open row and the word `due today`.
 */
export function AskPanel({
	title,
	info,
	count,
	countDone,
	rows,
	footer,
}: AskPanelProps) {
	return (
		<Card
			size="small"
			styles={{ body: { padding: 0 } }}
			title={
				<Flex gap={8} align="center">
					<span className={styles.title}>{title}</span>
					{!!info && (
						<Tooltip title={info}>
							<IconInfoCircle size={14} className={styles.info} />
						</Tooltip>
					)}
				</Flex>
			}
			extra={
				!!count && (
					<span className={clsx(styles.count, countDone && styles.countDone)}>
						{count}
					</span>
				)
			}
		>
			<div className={styles.rows}>
				{rows.map((row) => (
					<div key={row.key} className={styles.row}>
						<span className={clsx(styles.glyph, styles[row.glyph])}>
							{row.glyph === "done" && <IconCheck size={14} />}
							{row.glyph === "open" && <span className={styles.dot} />}
						</span>

						<Flex vertical gap={8} flex={1} className={styles.body}>
							<Flex gap={8} align="center" wrap>
								<Typography.Text className={styles.name}>
									{row.title}
								</Typography.Text>
								{!!row.owner && <Tag className={styles.owner}>{row.owner}</Tag>}
								<span className={styles.spacer} />
								{!!row.due && (
									<span
										className={clsx(styles.due, row.dueUrgent && styles.urgent)}
									>
										{row.due}
									</span>
								)}
							</Flex>

							{!!row.meta && (
								<Typography.Text type="secondary" className={styles.meta}>
									{row.meta}
								</Typography.Text>
							)}

							{!!row.actions && (
								<Flex gap={8} align="center" wrap>
									{row.actions}
								</Flex>
							)}
						</Flex>
					</div>
				))}
			</div>

			{!!footer && (
				<Flex
					gap={12}
					align="center"
					justify="space-between"
					className={styles.footer}
				>
					<Typography.Text type="secondary" className={styles.note}>
						{footer.note}
					</Typography.Text>
					{footer.action}
				</Flex>
			)}
		</Card>
	);
}
