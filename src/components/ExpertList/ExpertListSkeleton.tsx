import { Col, Flex, Row, Skeleton } from "antd";
import styles from "./style.module.scss";

const line = (width: string, height: number) => (
	<Skeleton.Input active block style={{ width, height, minWidth: 0 }} />
);

/** The expert cards' own grid and box while the list loads. */
export function ExpertListSkeleton({ count = 3 }: { count?: number }) {
	return (
		<Row gutter={[16, 16]} wrap aria-busy>
			{Array.from({ length: count }, (_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: placeholders carry no identity
				<Col span={24} md={12} lg={8} key={index}>
					<div className={styles.expertCard}>
						<div className={styles.expertCardContent}>
							<Skeleton.Avatar active shape="square" size={96} />
							<Flex vertical gap={8} flex={1}>
								{line("45%", 14)}
								{line("80%", 26)}
								{line("100%", 14)}
								{line("90%", 14)}
							</Flex>
						</div>
						<div className={styles.expertCardFooter}>
							<Flex vertical gap={6} flex={1}>
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
