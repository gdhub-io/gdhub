"use client";

import { IconFlask } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Tag } from "antd";
import styles from "./style.module.scss";

/**
 * Frame 12.15.6: Checkpoints are experimental, whoever the curator is (GDHUB-142).
 * `outlined` is the landing hero's capsule (frame 12.00, oVUcN).
 */
export function ExperimentalTag({
	variant = "page",
}: {
	variant?: "page" | "outlined";
}) {
	const { t } = useTranslate();

	return (
		<Tag
			className={
				variant === "outlined"
					? `${styles.tag} ${styles.outlined}`
					: `gd-tag-on-page ${styles.tag}`
			}
			icon={<IconFlask size={12} />}
		>
			{t("checkpoints.experimental", "Experimental")}
		</Tag>
	);
}
