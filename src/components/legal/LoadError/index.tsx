"use client";

import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Button, Typography } from "antd";
import { IconTile } from "@/components/ui";
import styles from "./style.module.scss";

/** The error rows of frames `ZssMc` and `P5Bfq`: what failed, and a way to try again. */
export function LoadError({
	title,
	onRetry,
}: {
	title: string;
	onRetry?: () => void;
}) {
	const { t } = useTranslate();
	return (
		<div className={styles.error}>
			<IconTile
				icon={IconAlertTriangle}
				size="sm"
				tint="var(--gd-danger-tint)"
				ink="var(--gd-danger-on-tint)"
			/>
			<Typography.Text className={styles.title}>{title}</Typography.Text>
			{onRetry && (
				<Button icon={<IconRefresh size={16} />} onClick={onRetry}>
					{t("common.try-again", "Try again")}
				</Button>
			)}
		</div>
	);
}
