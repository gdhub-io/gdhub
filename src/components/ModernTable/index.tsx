"use client";

import { IconInbox } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Table, type TableProps } from "antd";
import classNames from "classnames";
import { EmptyState, type EmptyStateProps } from "@/components/ui";
import styles from "./ModernTable.module.scss";

interface ModernTableProps<T> extends TableProps<T> {
	showHeader?: boolean;
	className?: string;
	/**
	 * What the table says when it has no rows. Pass one — a table that knows its
	 * subject can say something useful, and the generic fallback cannot.
	 */
	emptyState?: Partial<EmptyStateProps>;
}

export function ModernTable<T extends object>({
	className,
	showHeader = true,
	rowClassName,
	emptyState,
	locale,
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
				className,
			)}
		>
			<div className={styles.modernTableWrapper}>
				<Table<T>
					{...props}
					locale={{ ...locale, emptyText }}
					showHeader={showHeader}
					scroll={{ x: "max-content" }}
					rowClassName={(record, index) => {
						const baseClassName = "table-row";
						return typeof rowClassName === "function"
							? `${baseClassName} ${rowClassName(record, index, 0)}`
							: baseClassName;
					}}
				/>
			</div>
		</div>
	);
}

export default ModernTable;
