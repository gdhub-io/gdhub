"use client";

import { useTranslate } from "@tolgee/react";
import { Typography } from "antd";
import dayjs from "dayjs";
import scout from "@/components/scout/ProjectCardModal/style.module.scss";
import styles from "./style.module.scss";

const { Text, Paragraph } = Typography;

export type DevlogCardProps = {
	publishedAt: string;
	content: string;
	/** Set for a devlog of this checkpoint; the project's others have none. */
	sprint?: number | null;
};

/** One devlog, read in place: the date and the text folded at six lines. */
export function DevlogCard({ publishedAt, content, sprint }: DevlogCardProps) {
	const { t } = useTranslate();

	return (
		<article className={styles.devlog}>
			<Text className={scout.eyebrow}>
				{[
					dayjs(publishedAt).format("D MMM YYYY"),
					sprint
						? t("checkpoints.path.sprint", "Sprint {n}", { n: sprint })
						: null,
				]
					.filter(Boolean)
					.join(" · ")}
			</Text>
			<Paragraph
				className={styles.devlogText}
				ellipsis={{
					rows: 6,
					expandable: "collapsible",
					symbol: (expanded) =>
						expanded
							? t("common.showLess", "Show less")
							: t("common.showMore", "Show more"),
				}}
			>
				{content}
			</Paragraph>
		</article>
	);
}
