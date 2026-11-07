import { Col, Flex, Row, Skeleton } from "antd";
import { SkeletonLine } from "@/components/ui/SkeletonLine";
import styles from "./style.module.scss";

const CARD_COUNT = 3;

/** The expert cards' own grid and box while the list loads. */
export function ExpertListSkeleton() {
	return (
		<Row gutter={[16, 16]} wrap aria-busy>
			{Array.from({ length: CARD_COUNT }, (_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: placeholders carry no identity
				<Col span={24} md={12} lg={8} key={index}>
					<div className={styles.expertCard}>
						<div className={styles.expertCardContent}>
							<Skeleton.Avatar active shape="square" size={96} />
							<Flex vertical gap={8} flex={1}>
								<SkeletonLine width={"45%"} height={14} />
								<SkeletonLine width={"80%"} height={26} />
								<SkeletonLine width={"100%"} height={14} />
								<SkeletonLine width={"90%"} height={14} />
							</Flex>
						</div>
						<div className={styles.expertCardFooter}>
							<Flex vertical gap={6} flex={1}>
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
