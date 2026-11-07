import { Col, Flex, Row, Skeleton } from "antd";
import styles from "./style.module.scss";

const line = (width: string, height: number) => (
	<Skeleton.Input active block style={{ width, height, minWidth: 0 }} />
);

/** The course cards' own grid and box while the list loads. */
export function CoursesListSkeleton({ count = 4 }: { count?: number }) {
	return (
		<Row gutter={[16, 16]} wrap aria-busy>
			{Array.from({ length: count }, (_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: placeholders carry no identity
				<Col span={24} md={12} lg={6} key={index}>
					<div className={styles.card}>
						<Skeleton.Node active className={styles.coverSkeleton} />
						<Flex vertical gap={8} className={styles.cardTitle}>
							{line("40%", 14)}
							{line("100%", 26)}
							{line("60%", 26)}
						</Flex>
						<div className={styles.cardFooter}>
							<Flex vertical gap={8} flex={1}>
								{line("50%", 14)}
								{line("35%", 14)}
							</Flex>
							<Skeleton.Button active />
						</div>
					</div>
				</Col>
			))}
		</Row>
	);
}
