import { Skeleton } from "antd";
import styles from "./styles.module.scss";

/** Two pills in the counters' own row — the common case on a phone. */
export function HubQuickCountsSkeleton() {
	return (
		<div className={styles.counts} aria-busy>
			{[0, 1].map((index) => (
				<Skeleton.Button
					key={index}
					active
					block
					shape="round"
					className={styles.pillSkeleton}
				/>
			))}
		</div>
	);
}
