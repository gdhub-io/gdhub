import { Col, Flex, Row, Skeleton } from "antd";
import cardStyles from "@/components/VacancyCard/style.module.scss";
import styles from "./style.module.scss";

const line = (width: string, height: number) => (
	<Skeleton.Input active block style={{ width, height, minWidth: 0 }} />
);

/** `VacancyCard`'s grid and box while the list loads. */
export function VacanciesListSkeleton({ count = 4 }: { count?: number }) {
	return (
		<Row gutter={[16, 16]} wrap aria-busy>
			{Array.from({ length: count }, (_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: placeholders carry no identity
				<Col span={24} md={12} lg={6} key={index}>
					<div className={cardStyles.jobCard}>
						<Skeleton.Node active className={styles.panelSkeleton} />
						<div className={cardStyles.jobCardFooter}>
							<Flex vertical gap={6} flex={1}>
								{line("55%", 14)}
								{line("40%", 14)}
							</Flex>
							<Skeleton.Button active />
						</div>
					</div>
				</Col>
			))}
		</Row>
	);
}
