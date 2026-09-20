"use client";

import { T } from "@tolgee/react";
import { Flex, Tag, Typography } from "antd";
import { AppAvatar } from "@/components/ui/AppAvatar";
import type { CheckpointCurator } from "@/repositories/checkpoint-curators";
import styles from "./CuratorRow.module.scss";

/**
 * A curator as a line: avatar, name, level, what they do — frame `p0BbE`.
 *
 * The same line is what the author picks from and what they are shown back
 * before paying, so it lives in one place: a curator that reads differently in
 * the two screens reads as a different curator.
 */
export function CuratorRow({ curator }: { curator: CheckpointCurator }) {
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
					<Tag bordered={false} className={styles.level}>
						<T keyName={curator.level} />
					</Tag>
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
