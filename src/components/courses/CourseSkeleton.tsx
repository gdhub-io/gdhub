import { Col, Row, Skeleton } from "antd";
import styles from "./CourseSkeleton.module.scss";

export type CourseColSpan = {
	xs?: number;
	sm?: number;
	md?: number;
	lg?: number;
	xl?: number;
};

export const DEFAULT_COURSE_COL_SPAN: CourseColSpan = {
	xs: 24,
	sm: 12,
	md: 8,
	lg: 8,
	xl: 6,
};

/** One `CourseCard`-sized block. */
export function CourseCardSkeleton() {
	return <Skeleton.Node active className={styles.card} />;
}

/** `CourseSection`'s grid of cards while it loads. */
export function CourseGridSkeleton({
	count = 4,
	colSpan = DEFAULT_COURSE_COL_SPAN,
}: {
	count?: number;
	colSpan?: CourseColSpan;
}) {
	return (
		<Row gutter={[6, 12]} aria-busy>
			{Array.from({ length: count }, (_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: placeholders carry no identity
				<Col key={index} {...colSpan}>
					<CourseCardSkeleton />
				</Col>
			))}
		</Row>
	);
}
