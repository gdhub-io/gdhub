import { Col, Flex, Row, Skeleton } from "antd";
import { SkeletonLine } from "@/components/ui/SkeletonLine";
import styles from "./style.module.scss";

const CARD_COUNT = 4;

/** The course cards' own grid and box while the list loads. */
export function CoursesListSkeleton() {
	return (
		<Row gutter={[16, 16]} wrap aria-busy>
			{Array.from({ length: CARD_COUNT }, (_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: placeholders carry no identity
				<Col span={24} md={12} lg={6} key={index}>
					<div className={styles.card}>
						<Skeleton.Node active className={styles.coverSkeleton} />
						<Flex vertical gap={8} className={styles.cardTitle}>
							<SkeletonLine width={"40%"} height={14} />
							<SkeletonLine width={"100%"} height={26} />
							<SkeletonLine width={"60%"} height={26} />
						</Flex>
						<div className={styles.cardFooter}>
							<Flex vertical gap={8} flex={1}>
								<SkeletonLine width={"50%"} height={14} />
								<SkeletonLine width={"35%"} height={14} />
							</Flex>
							<Skeleton.Button active />
						</div>
					</div>
				</Col>
			))}
		</Row>
	);
}
