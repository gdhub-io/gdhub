"use client";

import { Typography } from "antd";
import type { ReactNode } from "react";
import styles from "./style.module.scss";

export function Field({
	label,
	extra,
	children,
}: {
	label: string;
	extra?: string;
	children: ReactNode;
}) {
	return (
		<div className={styles.planField}>
			<div className={styles.fieldLabel}>
				<Typography.Text type="secondary" className={styles.small}>
					{label}
				</Typography.Text>
				{extra && (
					<Typography.Text className={`${styles.small} ${styles.tertiary}`}>
						{extra}
					</Typography.Text>
				)}
			</div>
			{children}
		</div>
	);
}
