import { Col, Flex, Row, Skeleton } from "antd";
import { SkeletonLine } from "@/components/ui/SkeletonLine";
import cardStyles from "@/components/VacancyCard/style.module.scss";
import styles from "./style.module.scss";

const CARD_COUNT = 4;

/** `VacancyCard`'s grid and box while the list loads. */
export function VacanciesListSkeleton() {
	return (
		<Row gutter={[16, 16]} wrap aria-busy>
			{Array.from({ length: CARD_COUNT }, (_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: placeholders carry no identity
				<Col span={24} md={12} lg={6} key={index}>
					<div className={cardStyles.jobCard}>
						<Skeleton.Node active className={styles.panelSkeleton} />
						<div className={cardStyles.jobCardFooter}>
							<Flex vertical gap={6} flex={1}>
								<SkeletonLine width={"55%"} height={14} />
								<SkeletonLine width={"40%"} height={14} />
							</Flex>
							<Skeleton.Button active />
						</div>
					</div>
				</Col>
			))}
		</Row>
	);
}
