"use client";

import { IconSparkles } from "@tabler/icons-react";
import { useTranslate } from "@tolgee/react";
import { Typography } from "antd";
import Link from "next/link";
import { AI_ACCURACY_HREF } from "@/components/checkpoints/entry/hrefs";
import styles from "./style.module.scss";

/** Frame 12.15.5: the quiet line under the AI curator's words (GDHUB-142). */
export function AiNote({ compact = false }: { compact?: boolean }) {
	const { t } = useTranslate();

	return (
		<div className={styles.note}>
			<IconSparkles size={14} className={styles.icon} />
			<Typography.Text type="secondary" className={styles.text}>
				{compact
					? t("checkpoints.aiNote.short", "AI can make mistakes.")
					: t(
							"checkpoints.aiNote.text",
							"AI can make mistakes. Check important details.",
						)}{" "}
				<Link href={AI_ACCURACY_HREF} target="_blank">
					{t("checkpoints.aiNote.link", "How it works")}
				</Link>
			</Typography.Text>
		</div>
	);
}
