import React from 'react'
import { Table, TableProps } from 'antd'
import classNames from 'classnames'
import styles from './ModernTable.module.scss'

interface ModernTableProps<T> extends TableProps<T> {
	showHeader?: boolean
	className?: string
}

export function ModernTable<T extends object>({
	className,
	showHeader = true,
	rowClassName,
	...props
}: ModernTableProps<T>) {
	return (
		<div className={classNames(styles.modernTableContainer, !showHeader && styles.tableNoHeader, className)}>
			<div className={styles.modernTableWrapper}>
				<Table<T>
					{...props}
					showHeader={showHeader}
					scroll={{ x: 'max-content' }}
					rowClassName={(record, index) => {
						const baseClassName = 'table-row'
						return typeof rowClassName === 'function'
							? `${baseClassName} ${rowClassName(record, index, 0)}`
							: baseClassName
					}}
				/>
			</div>
		</div>
	)
}

export default ModernTable
