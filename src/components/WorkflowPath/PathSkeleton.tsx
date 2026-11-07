import { Flex, Skeleton } from "antd";
import { SkeletonLine } from "@/components/ui/SkeletonLine";
import styles from "./style.module.scss";

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
						<SkeletonLine width={160} />
						<SkeletonLine width={96} />
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
							<SkeletonLine width={200} height={20} />
							<SkeletonLine width={120} />
						</Flex>
						{[300, 240, 180, 260].map((width) => (
							<Flex
								key={width}
								align="center"
								gap={12}
								className={styles.skeletonRow}
							>
								<SkeletonLine width={16} />
								<SkeletonLine width={width} />
								<SkeletonLine width={64} />
							</Flex>
						))}
					</Flex>
				</div>
				{[180, 140].map((width) => (
					<div key={width} className={styles.skeletonNode}>
						<Skeleton.Avatar active size={12} />
						<SkeletonLine width={width} />
					</div>
				))}
			</Flex>
			<aside className={styles.aside}>
				<div className={styles.asideCard}>
					<Flex vertical gap={12} className={styles.skeletonAsideBody}>
						<SkeletonLine width={120} />
						<SkeletonLine width="100%" />
						<SkeletonLine width={200} />
						<Skeleton.Button active block />
					</Flex>
				</div>
				<div className={styles.asideCard}>
					<Flex vertical gap={16} className={styles.skeletonAsideBody}>
						<SkeletonLine width={120} />
						{[200, 160, 180, 120, 150].map((width) => (
							<Flex key={width} gap={12} align="center">
								<Skeleton.Avatar active size={24} />
								<Flex vertical gap={6}>
									<SkeletonLine width={width} height={14} />
									<SkeletonLine width={64} height={12} />
								</Flex>
							</Flex>
						))}
					</Flex>
				</div>
			</aside>
		</div>
	);
}
