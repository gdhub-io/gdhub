"use client";

import { IconInbox } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Table, type TableProps } from "antd";
import classNames from "classnames";
import { EmptyState, type EmptyStateProps } from "@/components/ui";
import styles from "./ModernTable.module.scss";

/** A row that is in a state worth spotting before reading it. */
export type RowTone = "danger" | "warning" | "success";

const TONE_CLASS: Record<RowTone | "none", string | undefined> = {
	danger: styles.toneDanger,
	warning: styles.toneWarning,
	success: styles.toneSuccess,
	none: undefined,
};

interface ModernTableProps<T> extends TableProps<T> {
	showHeader?: boolean;
	className?: string;
	/**
	 * What the table says when it has no rows. Pass one — a table that knows its
	 * subject can say something useful, and the generic fallback cannot.
	 */
	emptyState?: Partial<EmptyStateProps>;
	/**
	 * Tints whole rows by state. Kept here rather than in each page's SCSS: the
	 * hover/selected backgrounds below are `!important`, so a page-level rule
	 * could only win by escalating too, losing the tint under the cursor.
	 */
	rowTone?: (record: T, index: number) => RowTone | undefined;
	/**
	 * `compact` tightens the rows vertically and nothing else — antd's
	 * `size="small"` also shrinks the header, breaking alignment with other tables.
	 */
	density?: "default" | "compact";
}

export function ModernTable<T extends object>({
	className,
	showHeader = true,
	rowClassName,
	emptyState,
	rowTone,
	density = "default",
	locale,
	scroll,
	...props
}: ModernTableProps<T>) {
	const { t } = useTranslate();

	// antd's default is a grey illustration reading "No data", which the
	// guidelines rule out. A caller-supplied `locale.emptyText` still wins.
	const emptyText = locale?.emptyText ?? (
		<EmptyState
			icon={emptyState?.icon ?? IconInbox}
			title={emptyState?.title ?? t("table.empty.title", "Nothing here yet")}
			description={emptyState?.description}
			action={emptyState?.action}
		/>
	);

	return (
		<div
			className={classNames(
				styles.modernTableContainer,
				!showHeader && styles.tableNoHeader,
				density === "compact" && styles.tableCompact,
				className,
			)}
		>
			<div className={styles.modernTableWrapper}>
				<Table<T>
					{...props}
					locale={{ ...locale, emptyText }}
					showHeader={showHeader}
					// `max-content` sizes the table to its content, which leaves
					// column widths advisory and lets one long string eat the row.
					// A caller that has fixed widths passes its own total instead.
					scroll={scroll ?? { x: "max-content" }}
					rowClassName={(record, index) =>
						classNames(
							"table-row",
							TONE_CLASS[rowTone?.(record, index) ?? "none"],
							typeof rowClassName === "function" &&
								rowClassName(record, index, 0),
						)
					}
				/>
			</div>
		</div>
	);
}

export default ModernTable;
