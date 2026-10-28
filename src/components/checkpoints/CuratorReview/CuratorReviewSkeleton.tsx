"use client";

import { Skeleton } from "antd";
import { CallLayout } from "@/components/checkpoints/CallRoom/CallParts";
import callStyles from "@/components/checkpoints/CallRoom/style.module.scss";
import styles from "./style.module.scss";

/** Path to Checkpoint while it loads, pro or ai alike: the page's own shape, empty. */
export function CuratorReviewSkeleton() {
	return (
		<CallLayout
			header={
				<div className={callStyles.header}>
					<div className={styles.skeletonTitles}>
						<Skeleton.Input
							active
							size="large"
							className={styles.skeletonTitle}
						/>
						<Skeleton.Input
							active
							size="small"
							className={styles.skeletonSub}
						/>
					</div>
				</div>
			}
			stage={
				<div className={styles.message}>
					<Skeleton
						avatar={{ size: 48 }}
						active
						title
						paragraph={{ rows: 3 }}
					/>
				</div>
			}
			aside={
				<aside className={styles.skeletonAside}>
					{[5, 4, 6].map((rows) => (
						<div key={rows} className={styles.skeletonWidget}>
							<Skeleton active title paragraph={{ rows }} />
						</div>
					))}
				</aside>
			}
			below={
				<>
					<div className={callStyles.goal}>
						<Skeleton active title={false} paragraph={{ rows: 2 }} />
					</div>
					<div className={callStyles.panel}>
						<Skeleton active title paragraph={{ rows: 8 }} />
					</div>
				</>
			}
		/>
	);
}
