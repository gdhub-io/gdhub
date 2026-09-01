"use client";

import { useTolgee } from "@tolgee/react";
import { Drawer, Flex, Grid, Modal, Tag } from "antd";
import type { ReactNode } from "react";
import { AppAvatar } from "@/components/ui/AppAvatar";
import { formatSlotTime } from "@/helpers/event";
import type { ScheduleItem } from ".";
import styles from "./SpeakersSheet.module.scss";

/**
 * Who is on for a session.
 *
 * The programme row shows faces and nothing else, which keeps a busy session
 * from pushing the next one off the screen — so the names, levels and
 * specialisations live here, one tap away, instead of being cut from the page.
 *
 * A sheet rising from the bottom is a phone gesture; on a wide screen the same
 * content belongs in a dialog in the middle, where the eye already is.
 */
export function SpeakersSheet({
	item,
	locale,
	onClose,
}: {
	item: ScheduleItem | null;
	locale: string;
	onClose: () => void;
}) {
	const { t } = useTolgee();
	const screens = Grid.useBreakpoint();
	const speakers = item?.speakers ?? [];
	const slot = item && formatSlotTime(item.startDate, item.endDate, locale);

	const heading: ReactNode = item && (
		<Flex vertical gap={2}>
			<span className={styles.when}>
				{slot?.start} — {slot?.end}
			</span>
			<span className={styles.title}>
				{item.title || t("event.schedule.item.title", "Untitled")}
			</span>
		</Flex>
	);

	const list = (
		<div>
			{speakers.map((speaker, index) => {
				const name = speaker.user?.profile?.name || "";
				return (
					<Flex
						key={speaker.id || index}
						align="flex-start"
						gap={12}
						className={styles.row}
					>
						<AppAvatar
							size={44}
							src={speaker.user?.image || undefined}
							alt={name}
						>
							{name ? name[0] : null}
						</AppAvatar>
						<Flex vertical gap={4} flex={1}>
							<span className={styles.name}>{name}</span>
							<Flex align="center" gap={8} wrap>
								{speaker.level && (
									<Tag variant="filled" className={styles.level}>
										{speaker.level}
									</Tag>
								)}
								{speaker.name && (
									<span className={styles.speciality}>{speaker.name}</span>
								)}
							</Flex>
							{speaker.specialization && (
								<span className={styles.specialization}>
									{speaker.specialization}
								</span>
							)}
						</Flex>
					</Flex>
				);
			})}
		</div>
	);

	if (screens.lg) {
		return (
			<Modal
				open={Boolean(item)}
				onCancel={onClose}
				footer={null}
				width={520}
				centered
				destroyOnHidden
				title={heading}
				classNames={{ body: styles.body }}
			>
				{list}
			</Modal>
		);
	}

	return (
		<Drawer
			open={Boolean(item)}
			onClose={onClose}
			placement="bottom"
			height="auto"
			className={styles.sheet}
			classNames={{ body: styles.body }}
			title={heading}
		>
			{list}
		</Drawer>
	);
}

export default SpeakersSheet;
