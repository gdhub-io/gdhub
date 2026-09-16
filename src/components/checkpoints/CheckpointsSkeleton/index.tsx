"use client";

import { Flex, Skeleton } from "antd";
import clsx from "clsx";
import styles from "./style.module.scss";

/**
 * `Skeleton.Node` paints its inner element, so the size has to land on both: the
 * wrapper is inline by default and would collapse a bar asked to fill its row.
 */
const Bar = ({ className, block }: { className: string; block?: boolean }) => (
	<Skeleton.Node
		active
		classNames={{
			root: clsx(styles.bar, block && styles.block, className),
			content: clsx(styles.node, className),
		}}
	/>
);

/**
 * The shape of the tab before it has loaded — frame `zAqpb`.
 *
 * It is the card and the rows it is about to become, not a generic block: the
 * point of the frame is that the skeleton holds the height, so nothing below it
 * jumps when the request lands.
 */
export function CheckpointsSkeleton() {
	return (
		<Flex vertical gap={32}>
			<section className={styles.card}>
				<header className={styles.head}>
					<Flex gap={12} align="center">
						<Bar className={styles.title} />
						<Bar className={styles.meta} />
					</Flex>
					<Flex gap={8} align="center">
						<Bar className={styles.avatar} />
						<Bar className={styles.curator} />
					</Flex>
				</header>

				<div className={styles.body}>
					<Flex vertical gap={8}>
						<Bar block className={styles.goal} />
						<Bar className={styles.goalLast} />
					</Flex>

					<Flex vertical gap={8}>
						<Bar className={styles.counter} />
						<Bar block className={styles.track} />
					</Flex>
				</div>

				<footer className={styles.foot}>
					<Bar className={styles.button} />
				</footer>
			</section>

			<Flex vertical gap={16}>
				{[0, 1].map((row) => (
					<div key={row} className={styles.past}>
						<Flex gap={8} align="center">
							<Bar className={styles.chip} />
							<Bar className={styles.pastMeta} />
						</Flex>
						<Bar className={styles.pastGoal} />
						<Bar className={styles.pastFoot} />
					</div>
				))}
			</Flex>
		</Flex>
	);
}
