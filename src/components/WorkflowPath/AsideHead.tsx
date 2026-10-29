import { Flex, Typography } from "antd";
import type { ReactNode } from "react";
import styles from "./style.module.scss";

const { Text } = Typography;

/**
 * The head of every card in the Workflow sidebar, one style for all (frames
 * `C7axzV`, `XmroV`): the title and a badge, what counts on the right, a line
 * under them. The list below draws the rule.
 */
export function AsideHead({
	title,
	badge,
	extra,
	sub,
}: {
	title: ReactNode;
	badge?: ReactNode;
	extra?: ReactNode;
	sub?: ReactNode;
}) {
	return (
		<div className={styles.asideHead}>
			<div className={styles.asideRow}>
				<Flex align="center" gap="small">
					<Text strong className={styles.asideTitle}>
						{title}
					</Text>
					{badge}
				</Flex>
				{extra && (
					<Text type="secondary" className={styles.asideMeta}>
						{extra}
					</Text>
				)}
			</div>
			{sub && (
				<Text type="secondary" className={styles.asideMeta}>
					{sub}
				</Text>
			)}
		</div>
	);
}
