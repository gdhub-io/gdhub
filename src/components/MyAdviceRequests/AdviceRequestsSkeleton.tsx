import { Skeleton } from "antd";
import styles from "./styles.module.scss";

const CARD_COUNT = 3;

/** The request cards of the full page while they load. */
export function AdviceRequestsSkeleton() {
	return (
		<div className={styles.requestsList} aria-busy>
			{Array.from({ length: CARD_COUNT }, (_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: placeholders carry no identity
				<div key={index} className={styles.requestCard}>
					<Skeleton active avatar title={false} paragraph={{ rows: 3 }} />
				</div>
			))}
		</div>
	);
}
