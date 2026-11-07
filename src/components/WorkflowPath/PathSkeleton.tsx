import { Flex, Skeleton } from "antd";
import styles from "./style.module.scss";

const Line = ({
	width,
	height = 16,
}: {
	width: number | string;
	height?: number;
}) => <Skeleton.Node active style={{ width, height }} />;

/** The Workflow tab while its data loads — frame 04.08.1 (`TJ0MG`) in platform-design.pen. */
export function PathSkeleton() {
	return (
		<div className={styles.layout} aria-busy>
			<Flex vertical gap={16}>
				<div className={styles.skeletonNode}>
					<Skeleton.Avatar active size={20} />
					<Flex
						className={styles.skeletonStage}
						justify="space-between"
						align="center"
					>
						<Line width={160} />
						<Line width={96} />
					</Flex>
				</div>
				<div className={styles.skeletonNode}>
					<Skeleton.Avatar active size={20} />
					<Flex vertical className={styles.skeletonCurrent}>
						<Flex
							justify="space-between"
							align="center"
							className={styles.skeletonHead}
						>
							<Line width={200} height={20} />
							<Line width={120} />
						</Flex>
						{[300, 240, 180, 260].map((width) => (
							<Flex
								key={width}
								align="center"
								gap={12}
								className={styles.skeletonRow}
							>
								<Line width={16} />
								<Line width={width} />
								<Line width={64} />
							</Flex>
						))}
					</Flex>
				</div>
				{[180, 140].map((width) => (
					<div key={width} className={styles.skeletonNode}>
						<Skeleton.Avatar active size={12} />
						<Line width={width} />
					</div>
				))}
			</Flex>
			<aside className={styles.aside}>
				<div className={styles.asideCard}>
					<Flex vertical gap={12} className={styles.skeletonAsideBody}>
						<Line width={120} />
						<Line width="100%" />
						<Line width={200} />
						<Skeleton.Button active block />
					</Flex>
				</div>
				<div className={styles.asideCard}>
					<Flex vertical gap={16} className={styles.skeletonAsideBody}>
						<Line width={120} />
						{[200, 160, 180, 120, 150].map((width) => (
							<Flex key={width} gap={12} align="center">
								<Skeleton.Avatar active size={24} />
								<Flex vertical gap={6}>
									<Line width={width} height={14} />
									<Line width={64} height={12} />
								</Flex>
							</Flex>
						))}
					</Flex>
				</div>
			</aside>
		</div>
	);
}
