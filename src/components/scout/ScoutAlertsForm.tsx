"use client";

import { useTranslate } from "@tolgee/react";
import { Flex, Switch, Typography } from "antd";
import type { ScoutCabinet } from "@/repositories/scout";
import { ScoutSettingsCard } from "./ScoutSettingsCard";
import { useCabinetMutation } from "./useCabinetMutation";

const { Text } = Typography;

export function ScoutAlertsForm({ cabinet }: { cabinet: ScoutCabinet }) {
	const { t } = useTranslate();
	const save = useCabinetMutation();

	const rows = [
		{
			key: "alertOnMatchingProjects" as const,
			title: t("scout.settings.alerts.matching", "New matching projects"),
			description: t(
				"scout.settings.alerts.matching.hint",
				"Get notified when a new project matches your Investment Focus",
			),
		},
		{
			key: "alertOnSavedSearches" as const,
			title: t("scout.settings.alerts.saved", "Saved search alerts"),
			description: t(
				"scout.settings.alerts.saved.hint",
				"Notify me when your saved searches have new results",
			),
		},
		{
			key: "alertMonthlyDigest" as const,
			title: t("scout.settings.alerts.digest", "Monthly digest"),
			description: t(
				"scout.settings.alerts.digest.hint",
				"A monthly summary of new early-stage projects on the platform",
			),
		},
	];

	return (
		<ScoutSettingsCard
			title={t("scout.settings.alerts.title", "Alerts")}
			description={t(
				"scout.settings.alerts.description",
				"Planned. Nothing is being sent yet — these switch on with the delivery behind them.",
			)}
		>
			<Flex vertical gap={24}>
				{rows.map((row) => (
					<Flex key={row.key} align="center" justify="space-between" gap={16}>
						<Flex vertical>
							<Text strong>{row.title}</Text>
							<Text type="secondary">{row.description}</Text>
						</Flex>
						{/* Disabled until something reads these flags: a switch that
						    saves but never sends teaches the scout the setting is broken.
						    The mutation stays wired, so shipping delivery is one word. */}
						<Switch
							disabled
							checked={cabinet[row.key]}
							loading={save.isPending}
							onChange={(checked) => save.mutate({ [row.key]: checked })}
						/>
					</Flex>
				))}
			</Flex>
		</ScoutSettingsCard>
	);
}
