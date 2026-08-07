"use client";

import { IconArrowRight, IconMinus, IconPlus } from "@tabler/icons-react";
import { Flex } from "antd";
import type { LocalChange } from "@/services/workflow/diffFromTemplate";
import styles from "./LocalChangeList.module.scss";

/**
 * A list of differences from a template, read the same way everywhere it shows.
 *
 * The editor, the reset preview and the differences dialog all describe the same
 * facts, and a reader who learns the shape in one of them should not have to
 * learn it again in the next.
 */
export function LocalChangeList({ changes }: { changes: LocalChange[] }) {
	return (
		<Flex vertical gap={8}>
			{changes.map((change) => (
				<Flex
					align="flex-start"
					gap={8}
					key={change.text}
					className={styles.change}
				>
					{change.kind === "added" && (
						<IconPlus size={14} className={`${styles.icon} ${styles.added}`} />
					)}
					{change.kind === "removed" && (
						<IconMinus
							size={14}
							className={`${styles.icon} ${styles.removed}`}
						/>
					)}
					{change.kind === "moved" && (
						<IconArrowRight
							size={14}
							className={`${styles.icon} ${styles.moved}`}
						/>
					)}
					<span>{change.text}</span>
				</Flex>
			))}
		</Flex>
	);
}

export default LocalChangeList;
