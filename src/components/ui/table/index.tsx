import { Skeleton } from "antd";
import type { ColumnsType } from "antd/es/table";
import tableStyles from "./style.module.scss";

/** The admin list look: a white clipped card, hairlines inside only (rule 8). */
export { tableStyles };

/** Placeholder rows while a list loads; `rowKey` is the field the table keys on. */
export const skeletonRows = <Row,>(count: number, rowKey: keyof Row) =>
	Array.from({ length: count }, (_, index) => ({
		[rowKey]: `skeleton-${index}`,
	})) as Row[];

/** The same columns drawing a bar in every cell but the row menu. */
export const skeletonColumns = <Row,>(
	columns: ColumnsType<Row>,
): ColumnsType<Row> =>
	columns.map((column) => ({
		...column,
		render: () =>
			column.key === "action" ? null : <Skeleton.Input active size="small" />,
	}));

/** The fixed columns plus the least the one flexible column may shrink to before the table scrolls. */
export const tableScrollX = <Row,>(
	columns: ColumnsType<Row>,
	flexMin: number,
) =>
	columns.reduce((sum, column) => sum + (Number(column.width) || 0), flexMin);
