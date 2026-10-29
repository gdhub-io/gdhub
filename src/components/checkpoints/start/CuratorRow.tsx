"use client";

import { T } from "@tolgee/react";
import { Flex, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { AppAvatar } from "@/components/ui/AppAvatar";
import type { CheckpointCurator } from "@/types/checkpoints";
import styles from "./CuratorRow.module.scss";

/**
 * A curator as a line: avatar, name, level, what they do — frame `p0BbE`.
 *
 * The same line is what the author picks from and what they are shown back
 * before paying, so it lives in one place: a curator that reads differently in
 * the two screens reads as a different curator.
 */
export function CuratorRow({
	curator,
	freeFrom,
}: {
	curator: CheckpointCurator;
	/** The earliest first call, when the row is picked from. */
	freeFrom?: string;
}) {
	return (
		<Flex gap={12} align="center" className={styles.row}>
			<AppAvatar src={curator.image} size={40}>
				{curator.name.slice(0, 1).toUpperCase()}
			</AppAvatar>
			<Flex vertical gap={4} className={styles.text}>
				<Flex gap={8} align="center">
					<Typography.Text className={styles.name}>
						{curator.name}
					</Typography.Text>
					<Tag>
						<T keyName={curator.level} />
					</Tag>
					{freeFrom && (
						<Typography.Text type="secondary" className={styles.freeFrom}>
							<T
								keyName="checkpoints.curator.freeFrom"
								defaultValue="· free from {date}"
								params={{ date: dayjs(freeFrom).format("ddd D MMM") }}
							/>
						</Typography.Text>
					)}
				</Flex>
				<Typography.Text
					type="secondary"
					className={styles.specialisations}
					ellipsis
				>
					{[curator.role, curator.specialization].filter(Boolean).join(" · ")}
				</Typography.Text>
			</Flex>
		</Flex>
	);
}
