"use client";

import { IconInbox } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Table, type TableProps } from "antd";
import classNames from "classnames";
import {
	EmptyState,
	type EmptyStateProps,
	skeletonColumns,
} from "@/components/ui";
import styles from "./ModernTable.module.scss";

/** A row that is in a state worth spotting before reading it. */
export type RowTone = "danger" | "warning" | "success";

const SKELETON_ROWS: object[] = Array.from({ length: 5 }, (_, index) => ({
	key: `skeleton-${index}`,
}));

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
	/**
	 * `DS · 11 Tables`: a table is a white card, or — `page` — an outlined panel
	 * straight on the page ground with its paging outside the outline.
	 */
	surface?: "card" | "page";
}

export function ModernTable<T extends object>({
	className,
	showHeader = true,
	rowClassName,
	emptyState,
	rowTone,
	density = "default",
	surface = "card",
	locale,
	scroll,
	...props
}: ModernTableProps<T>) {
	const { t } = useTranslate();

	// Loading with no rows yet draws the table's own columns as bars; a refetch
	// keeps the spinner over the rows it has. `loading` stays explicit: a missing
	// `dataSource` is also what a disabled or failed query leaves behind.
	const skeleton = !!props.loading && !props.dataSource?.length;
	const skeletonProps: Partial<TableProps<T>> = skeleton
		? {
				columns: skeletonColumns(
					(props.columns ?? []).map(
						({ onCell, sorter, filters, ...column }) => column,
					),
				),
				dataSource: SKELETON_ROWS as T[],
				rowKey: "key",
				loading: false,
				pagination: false,
				rowSelection: undefined,
				expandable: undefined,
				onRow: undefined,
			}
		: {};

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
				surface === "page" && styles.onPage,
				className,
			)}
		>
			<div className={styles.modernTableWrapper}>
				<Table<T>
					{...props}
					{...skeletonProps}
					aria-busy={skeleton || undefined}
					locale={{ ...locale, emptyText }}
					showHeader={showHeader}
					// `max-content` sizes the table to its content, which leaves
					// column widths advisory and lets one long string eat the row.
					// A caller that has fixed widths passes its own total instead.
					// An empty table has nothing to scroll to, so it gets no scrollbar.
					scroll={
						props.dataSource?.length
							? (scroll ?? { x: "max-content" })
							: undefined
					}
					rowClassName={(record, index) =>
						classNames(
							"table-row",
							!skeleton && TONE_CLASS[rowTone?.(record, index) ?? "none"],
							!skeleton &&
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
