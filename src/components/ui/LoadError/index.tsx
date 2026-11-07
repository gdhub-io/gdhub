"use client";

import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Typography } from "antd";
import { IconTile } from "@/components/ui/IconTile";
import styles from "./style.module.scss";

/**
 * A block whose data failed to load — frames `ZssMc` and `P5Bfq`: what failed,
 * and a way to try again. Without it a failed query reads as "empty".
 */
export function LoadError({
	title,
	onRetry,
	bare,
}: {
	/** Already-translated; names what failed. */
	title?: string;
	/** Called with no arguments, so a query's `refetch` can be passed as is. */
	onRetry?: () => unknown;
	/** Inside a table or card that is already outlined: no frame of its own. */
	bare?: boolean;
}) {
	const { t } = useTranslate();

	return (
		<div className={bare ? `${styles.error} ${styles.bare}` : styles.error}>
			<IconTile
				icon={IconAlertTriangle}
				size="sm"
				tint="var(--gd-danger-tint)"
				ink="var(--gd-danger-on-tint)"
			/>
			<Typography.Text className={styles.title}>
				{title ?? t("common.load-error", "This could not be loaded")}
			</Typography.Text>
			{onRetry && (
				<Button icon={<IconRefresh size={16} />} onClick={() => onRetry()}>
					{t("common.try-again", "Try again")}
				</Button>
			)}
		</div>
	);
}
