"use client";

import { useTranslate } from "@tolgee/react";
import { Flex, Skeleton, Typography } from "antd";
import { useState } from "react";
import { ActivityFeed } from "../parts";
import styles from "../style.module.scss";
import type { CardActivity } from "../types";
import { useCardSection } from "../useSection";

const { Text } = Typography;

/** The whole log, newest first: 20 rows, then 20 more on demand. */
const ACTIVITY_PAGE = 20;

export function ActivitiesTab({ projectId }: { projectId: string }) {
	const { t } = useTranslate();
	const [limit, setLimit] = useState(ACTIVITY_PAGE);
	const { data, isLoading } = useCardSection<CardActivity[]>(
		projectId,
		"activities",
		limit,
	);

	return (
		<Flex vertical gap={12}>
			<Text className={styles.sectionTitle}>
				{t("scout.card.activity.log", "Activity log")}
			</Text>
			{isLoading ? (
				<Skeleton active title={false} paragraph={{ rows: 8 }} />
			) : (
				<ActivityFeed
					items={data ?? []}
					detailed
					onMore={
						data?.length === limit
							? () => setLimit(limit + ACTIVITY_PAGE)
							: undefined
					}
				/>
			)}
		</Flex>
	);
}
