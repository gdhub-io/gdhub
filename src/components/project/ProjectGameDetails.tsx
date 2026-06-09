"use client";

import { useTranslate } from "@tolgee/react";
import { Flex, Typography } from "antd";
import {
	getHubSectionShellClass,
	HubSectionBleed,
	HubSectionBody,
	HubSectionHeader,
} from "@/components/hub/HubSection";
import styles from "./ProjectGameDetails.module.scss";

const { Text } = Typography;

type GameDetailsProject = {
	genre?: string | null;
	setting?: string | null;
	audition?: string | null;
	platform?: string | null;
	visualStyle?: string | null;
};

/**
 * "Game details" sidebar card — key/value rows describing the game.
 * Shared between the project page and the vacancy page.
 */
export function ProjectGameDetails({
	project,
}: {
	project?: GameDetailsProject | null;
}) {
	const { t } = useTranslate();

	if (!project) return null;

	const items = [
		{ label: t("page.project.genre", "Genre"), value: project.genre },
		{
			label: t("page.project.setting", "Game Setting"),
			value: project.setting,
		},
		{ label: t("page.project.audition", "Audition"), value: project.audition },
		{ label: t("page.project.platform", "Platform"), value: project.platform },
		{
			label: t("page.project.visualStyle", "Visual Style"),
			value: project.visualStyle,
		},
	].filter((item) => !!item.value);

	if (!items.length) return null;

	return (
		<section className={getHubSectionShellClass("sidebar")}>
			<HubSectionHeader title={t("page.project.aboutGame", "Game details")} />
			<HubSectionBody>
				<HubSectionBleed>
					<Flex vertical>
						{items.map((item) => (
							<Flex
								key={item.label}
								justify="space-between"
								align="flex-start"
								gap={12}
								className={styles.item}
							>
								<Text type="secondary" className={styles.label}>
									{item.label}
								</Text>
								<Text className={styles.value}>{item.value}</Text>
							</Flex>
						))}
					</Flex>
				</HubSectionBleed>
			</HubSectionBody>
		</section>
	);
}
