import { Skeleton } from "antd";
import styles from "./styles.module.scss";

/** The request cards of the full page while they load. */
export function AdviceRequestsSkeleton({ count = 3 }: { count?: number }) {
	return (
		<div className={styles.requestsList} aria-busy>
			{Array.from({ length: count }, (_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: placeholders carry no identity
				<div key={index} className={styles.requestCard}>
					<Skeleton active avatar title={false} paragraph={{ rows: 3 }} />
				</div>
			))}
		</div>
	);
}
